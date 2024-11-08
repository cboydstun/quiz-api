## Authentication Queries and Mutations

### Get Google Auth URL

Generates a URL for Google OAuth authentication.

```graphql
query GetGoogleAuthUrl {
  getGoogleAuthUrl {
    url
  }
}
```

### Register a new user

Registers a new user with the provided information.

```graphql
mutation Register($input: CreateUserInput!) {
  register(input: $input) {
    token
    user {
      id
      username
      email
      role
    }
  }
}
```

### Login

Authenticates a user with their email and password.

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    user {
      id
      username
      email
      role
    }
  }
}
```

### Authenticate with Google

Authenticates a user using Google OAuth.

```graphql
mutation AuthenticateWithGoogle($code: String!) {
  authenticateWithGoogle(code: $code) {
    token
    user {
      id
      username
      email
      role
    }
  }
}
```
