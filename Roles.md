# API Role-Based Access Control (RBAC) Overview

## Roles and Responsibilities

### 1. Super Admin

The Super Admin holds the highest level of access within the API and is responsible for managing Admin users. They have full control over user and role management.

**Permissions:**

- **Add / Remove Admins**
- **Add / Remove Editors**
- **Add / Remove Users**
- **Add / Remove / Edit Questions and Answers**

### 2. Admin

Admins can manage Editors and Users. They have similar permissions as the Super Admin, except for managing Admins.

**Permissions:**

- **Add / Remove Editors**
- **Add / Remove Users**
- **Add / Remove / Edit Questions and Answers**

### 3. Editor

Editors have the ability to manage content related to questions and answers. They can manage standard Users but cannot manage Admins or other Editors.

**Permissions:**

- **Add / Remove Users**
- **Add / Remove / Edit Questions and Answers**

### 4. User

Users can register to go through quiz questions. They do not have any administrative permissions.

**Permissions:**

- **Register / Login**
- **Attempt Multiple Choice Questions**

## Entity Breakdown

### 1. Users

- **Fields:**
  - ID
  - Username
  - Email
  - Password (hashed with bcrypt)
  - Role (Super Admin, Admin, Editor, User)
- **Authentication:**
  - JWT for authentication (jsonwebtoken)
  - Passwords hashed with bcryptjs

### 2. Questions

- **Fields:**
  - ID
  - Prompt
  - Question Text
  - Multiple Choice Answers (Array)
  - Correct Answer
  - Created By (Editor or Admin)

### 3. Roles

- **Fields:**
  - ID
  - Role Name (Super Admin, Admin, Editor, User)

## Role-based Authorization

- Each role will be associated with a set of permissions to control which actions they can perform.
- Permissions will be checked before executing any mutations that involve user or content management.
- JWT will contain role information for checking access.

## Access Control Logic

- **Super Admin Access:** Can perform any action across all entities.
- **Admin Access:** Can manage Editors and Users but cannot manage other Admins.
- **Editor Access:** Can manage quiz content and Users.
- **User Access:** Can register, log in, and attempt questions.

### Example GraphQL Queries / Mutations

- **CreateUser (Super Admin / Admin / Editor)**
- **CreateQuestion (Super Admin / Admin / Editor)**
- **EditQuestion (Super Admin / Admin / Editor)**
- **DeleteQuestion (Super Admin / Admin / Editor)**
- **AddAdmin (Super Admin Only)**
- **AddEditor (Super Admin / Admin)**

## Authentication and Authorization Flow

1. **Authentication**:

   - When a user logs in, a JWT token is created that includes the user's ID and role.

2. **Authorization**:
   - The JWT token is verified on each request.
   - The role is extracted from the token and checked against the required permissions for the action being performed.

---

This structure will help maintain a clean and secure flow for managing users, roles, and content in your quiz application.
