import { createFileRoute } from '@tanstack/react-router';

import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const Route = createFileRoute('/api/list-users')({
  server: {
    handlers: {
        GET: async ({ request }) => {   
            const users = await workos.userManagement.listUsers();
            return new Response(JSON.stringify(users.data), { status: 200 });
        }
    }
  },
});
