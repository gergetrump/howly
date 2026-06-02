import * as userService from '../users/user.service.js';

export async function restoreUser(req, res) {
    const user = await userService.restoreUser(req.params.id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
}