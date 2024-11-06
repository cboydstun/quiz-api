# API Role-Based Access Control (RBAC) Overview

## Roles and Responsibilities

### 1. Super Admin

The Super Admin holds the highest level of access within the API and is responsible for managing Admin users. They have full control over user and role management.

**Permissions:**

- All permissions of Admin, Editor, and User roles
- Add / Remove / Edit Admins
- Change user roles to any level, including SUPER_ADMIN

### 2. Admin

Admins can manage Editors and Users. They have similar permissions as the Super Admin, except for managing Admins.

**Permissions:**

- All permissions of Editor and User roles
- Add / Remove / Edit Editors
- Add / Remove / Edit Users
- Change user roles (except to SUPER_ADMIN)
- Update user statistics
- Update login streaks

### 3. Editor

Editors have the ability to manage content related to questions and answers. They can manage standard Users but cannot manage Admins or other Editors.

**Permissions:**

- All permissions of User role
- Add / Remove / Edit Questions and Answers
- View all users

### 4. User

Users can register to go through quiz questions. They do not have any administrative permissions.

**Permissions:**

- Register / Login
- Update own username and password
- View and attempt quiz questions
- View own response history
- View leaderboard

## Entity Breakdown

### 1. Users

- **Fields:**
  - ID
  - Username
  - Email
  - Password (hashed with bcrypt)
  - Role (Super Admin, Admin, Editor, User)
  - Score
  - QuestionsAnswered
  - QuestionsCorrect
  - QuestionsIncorrect
  - LifetimePoints
  - YearlyPoints
  - MonthlyPoints
  - DailyPoints
  - ConsecutiveLoginDays
  - LastLoginDate
  - CreatedAt
  - UpdatedAt
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
  - Points
  - Created By (Editor or Admin)

### 3. Roles

- **Fields:**
  - ID
  - Role Name (Super Admin, Admin, Editor, User)

### 4. User Responses

- **Fields:**
  - User ID
  - Question ID
  - Selected Answer
  - Is Correct

## Role-based Authorization

- Each role is associated with a set of permissions that control which actions they can perform.
- Permissions are checked before executing any mutations that involve user or content management.
- JWT contains role information for checking access.

## Access Control Logic

- **Super Admin Access:** Can perform any action across all entities.
- **Admin Access:** Can manage Editors and Users but cannot manage other Admins.
- **Editor Access:** Can manage quiz content and view Users.
- **User Access:** Can register, log in, attempt questions, and view their own data.

### Example GraphQL Queries / Mutations

- **Register (All roles)**
- **Login (All roles)**
- **GetCurrentUser (All roles)**
- **GetAllUsers (Admin, Editor)**
- **GetUserById (Admin)**
- **ChangeUserRole (Admin)**
- **DeleteUser (Admin)**
- **UpdateUserStats (Admin)**
- **UpdateLoginStreak (Admin)**
- **UpdateUsername (All roles, own account only)**
- **UpdatePassword (All roles, own account only)**
- **CreateQuestion (Admin, Editor)**
- **GetAllQuestions (All roles)**
- **GetQuestionById (All roles)**
- **UpdateQuestion (Admin, Editor)**
- **DeleteQuestion (Admin, Editor)**
- **SubmitAnswer (User)**
- **GetUserResponses (User, own responses only)**

## Authentication and Authorization Flow

1. **Authentication**:

   - When a user logs in, a JWT token is created that includes the user's ID and role.

2. **Authorization**:
   - The JWT token is verified on each request.
   - The role is extracted from the token and checked against the required permissions for the action being performed.

---

This structure helps maintain a clean and secure flow for managing users, roles, and content in the quiz application. The role-based access control ensures that users can only perform actions appropriate to their assigned role, maintaining the integrity and security of the system.
