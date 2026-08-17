import { supabaseAdmin } from "../src/integrations/supabase/client.server";
const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 3 });
console.log(data.users.map((u) => u.id));
