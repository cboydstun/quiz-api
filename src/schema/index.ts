// src/schema/index.ts

import types from './types';
import userSchema from './userSchema';
import questionSchema from './questionSchema';
import authSchema from './authSchema';

const typeDefs = [types, userSchema, questionSchema, authSchema];

export default typeDefs;
