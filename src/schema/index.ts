// src/schema/index.ts

import types from "./types";
import userSchema from "./userSchema";
import questionSchema from "./questionSchema";
import authSchema from "./authSchema";
import badgeSchema from "./badgeSchema";

const typeDefs = [types, userSchema, questionSchema, authSchema, badgeSchema];

export default typeDefs;
