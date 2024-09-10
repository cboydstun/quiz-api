# Quiz API

This project is a role-based API built with Apollo Server and GraphQL, using MongoDB as the database. The API features role-based access control (RBAC) where users can have different roles such as Super Admin, Admin, Editor, and User. The API allows for the management of users, roles, quiz questions, and answers.

## Table of Contents

- [Installation](#installation)
- [Technologies](#technologies)
- [Roles & Permissions](#roles--permissions)
- [GraphQL Schema](#graphql-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/quiz-api.git
cd quiz-api
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables (see the Environment Variables section).

4. Start the server:

```bash
pnpm run dev
```

## Technologies

- Apollo Server
- GraphQL
- MongoDB / Mongoose
- bcryptjs (for password hashing)
- jsonwebtoken (for authentication)
- TypeScript

## Roles & Permissions

The API implements Role-Based Access Control (RBAC) for managing users, questions, and other entities.

### 1. Super Admin

The Super Admin holds the highest level of access within the API and is responsible for managing Admin users. They have full control over user and role management.

**Permissions:**

- Add / Remove Admins
- Add / Remove Editors
- Add / Remove Users
- Add / Remove / Edit Questions and Answers

### 2. Admin

Admins can manage Editors and Users. They have similar permissions as the Super Admin, except for managing Admins.

**Permissions:**

- Add / Remove Editors
- Add / Remove Users
- Add / Remove / Edit Questions and Answers

### 3. Editor

Editors have the ability to manage content related to questions and answers. They can manage standard Users but cannot manage Admins or other Editors.

**Permissions:**

- Add / Remove Users
- Add / Remove / Edit Questions and Answers

### 4. User

Users can register to go through quiz questions. They do not have any administrative permissions.

**Permissions:**

- Register / Login
- Attempt Multiple Choice Questions

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

## Environment Variables

Create a .env file in the root directory and add the following environment variables:

```bash
MONGO_URI=mongodb://localhost:27017/quiz-api
JWT_SECRET=your_jwt_secret
PORT=4000
```

## Usage

### Running the API Locally

After setting up the environment variables and running `npm run dev`, you can visit the GraphQL playground at `http://localhost:4000/graphql`.

### Example Queries / Mutations

- **Register User (Open for all):**

```graphql
mutation {
  createUser(
    input: {
      username: "newuser"
      email: "newuser@example.com"
      password: "password123"
    }
  ) {
    id
    username
    email
    role
  }
}
```

- **Login User**

```graphql
mutation {
  login(email: "newuser@example.com", password: "password123") {
    token
  }
}
```

- **Create Question (Editor/Admin Only):**

```graphql
mutation {
  createQuestion(
    input: {
      questionText: "What is the capital of France?"
      answers: ["Paris", "London", "Berlin", "Rome"]
      correctAnswer: "Paris"
    }
  ) {
    id
    questionText
    answers
    correctAnswer
  }
}
```

## Contributing

Contributions are welcome! If you would like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

Please make sure to update tests as appropriate.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
