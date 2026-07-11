import * as userService from '../users/user.service.js';

// DEV-ONLY: temporary helper for local testing. Delete before production use.
export async function listUsers(req, res) {
    const users = await userService.listDevUsers();

    return res
        .status(200)
        .type('json')
        .send(`${JSON.stringify(users, null, 2)}\n`);
}
