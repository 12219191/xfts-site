import path from "path";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { componentTagger } from "lovable-tagger";

function devClientErrorLogger() {
  const VIRTUAL_ID = "virtual:dev-client-error-handler";
  const RESOLVED_ID = "\0" + VIRTUAL_ID;

  return {
    name: "dev-client-error-logger",
    apply: "serve" as const,
    enforce: "pre" as const,

    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    load(id: string) {
      if (id !== RESOLVED_ID) return;
      return [
        "if (typeof window !== 'undefined' && import.meta.hot) {",
        "  const send = (d) => { try { import.meta.hot.send('client-runtime-error', d) } catch {} };",
        "  window.addEventListener('error', (e) => {",
        "    send({ type: 'runtime-error', message: e.message, stack: e.error?.stack, filename: e.filename, lineno: e.lineno, colno: e.colno });",
        "  });",
        "  window.addEventListener('unhandledrejection', (e) => {",
        "    const err = e.reason;",
        "    send({ type: 'unhandled-rejection', message: err?.message || String(err), stack: err?.stack });",
        "  });",
        "}",
      ].join("\n");
    },

    configureServer(server: import("vite").ViteDevServer) {
      const origConsoleError = console.error;
      let forwarding = false;
      console.error = (...args: unknown[]) => {
        origConsoleError.apply(console, args);
        if (forwarding) return;
        forwarding = true;
        try {
          const error = args[0];
          if (error instanceof Error) {
            server.ws.send({
              type: "custom",
              event: "client-runtime-error",
              data: {
                source: "ssr",
                type: "ssr-render-error",
                name: error.name,
                message: error.message,
                stack: error.stack,
              },
            });
          }
        } finally {
          forwarding = false;
        }
      };

      server.ws.on(
        "client-runtime-error",
        (data: Record<string, string>) => {
          const { type, message, stack, filename, lineno, colno } = data;
          const label =
            type === "unhandled-rejection"
              ? "Unhandled Rejection"
              : "Runtime Error";
          let loc = "";
          if (filename) {
            loc = ` at ${filename}`;
            if (lineno != null) loc += `:${lineno}`;
            if (colno != null) loc += `:${colno}`;
          }
          server.config.logger.error(
            `\n[client] ${label}: ${message}${loc}`,
          );
          if (stack) {
            server.config.logger.error(stack);
          }

          server.ws.send({
            type: "custom",
            event: "client-runtime-error",
            data,
          });
        },
      );
    },

    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, "/");

      if (normalizedId.includes("routes/__root")) {
        return `import "${VIRTUAL_ID}";\n${code}`;
      }
    },
  };
}

function devServerFnErrorLogger() {
  const HMR_SEND_KEY = "__TANSTACK_SERVER_FN_HMR_SEND__";

  return {
    name: "dev-server-fn-error-logger",
    apply: "serve" as const,
    enforce: "pre" as const,
    configureServer(server: import("vite").ViteDevServer) {
      (globalThis as Record<string, unknown>)[HMR_SEND_KEY] = (data: unknown) => {
        server.ws.send({
          type: "custom",
          event: "server-fn-error",
          data,
        });
      };
    },
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, "/");
      const isTargetModule =
        normalizedId.includes(
          "/@tanstack/start-server-core/src/server-functions-handler.ts",
        ) ||
        normalizedId.includes(
          "/@tanstack/start-server-core/dist/esm/server-functions-handler.js",
        );

      if (!isTargetModule) {
        return null;
      }

      const needle = "const unwrapped = res.result || res.error";
      if (!code.includes(needle)) {
        return null;
      }

      return code.replace(
        needle,
        `${needle}

      if (res?.error) {
        const err = res.error
        const payload = {
          source: 'tanstack',
          type: 'server-fn-error',
          method: request.method,
          url: request.url,
          name: err?.name ?? 'Error',
          message: err?.message ?? String(err),
          stack: typeof err?.stack === 'string' ? err.stack : undefined,
        }
        globalThis.${HMR_SEND_KEY}?.(payload)
      }`,
      );
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // Use Cloudflare Workers plugin for builds (produces worker output)
  // Skip for dev server (command=serve) since workerd runtime isn't available
  const useCloudflare = command === "build";

  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  // Variáveis sem prefixo VITE_ ficam disponíveis apenas no servidor.
  const serverEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, serverEnv);

  return {
    server: {
      host: "::",
      port: 8080,
    },
    define: envDefine,
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              // Menos arquivos JS por página: robôs de busca (Googlebot) cortam
              // downloads paralelos e a página ficava em branco (soft 404).
              manualChunks(id: string) {
                const n = id.replace(/\\/g, "/");
                if (n.includes("/node_modules/lucide-react/")) return "icons";
                if (n.includes("/node_modules/")) return "vendor";
                if (n.includes("/src/components/") || n.includes("/src/lib/") || n.includes("/src/hooks/")) return "app";
                return undefined;
              },
            },
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        "entities": path.resolve(__dirname, "node_modules/entities"),
      },

      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      devClientErrorLogger(),
      devServerFnErrorLogger(),
      ...(useCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
      tanstackStart(),
      viteReact(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
  };
});
