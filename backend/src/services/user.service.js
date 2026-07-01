import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import { MESSAGES } from '../constants/messages.js';
import { parseQueryOptions } from '../utils/pagination.js';

const SEARCHABLE = ['name', 'email'];

class UserService {
  async list(query) {
    const options = parseQueryOptions(query, { searchableFields: SEARCHABLE });
    return userRepository.paginate(options);
  }

  async getById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound(MESSAGES.USER.NOT_FOUND, { code: 'USER_NOT_FOUND' });
    return user;
  }

  async create(payload) {
    if (await userRepository.exists({ email: payload.email.toLowerCase() })) {
      throw ApiError.conflict(MESSAGES.AUTH.EMAIL_IN_USE, { code: 'EMAIL_IN_USE' });
    }
    return userRepository.create(payload);
  }

  async update(id, payload) {
    const user = await userRepository.updateById(id, payload);
    if (!user) throw ApiError.notFound(MESSAGES.USER.NOT_FOUND, { code: 'USER_NOT_FOUND' });
    return user;
  }

  async remove(id) {
    const user = await userRepository.deleteById(id);
    if (!user) throw ApiError.notFound(MESSAGES.USER.NOT_FOUND, { code: 'USER_NOT_FOUND' });
    return user;
  }
}

export default new UserService();
