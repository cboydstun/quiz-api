## Leaderboard Queries

### Get Leaderboard

Retrieves the leaderboard with top users and the current user's position.

```graphql
query GetLeaderboard($limit: Int) {
  getLeaderboard(limit: $limit) {
    leaderboard {
      position
      user {
        id
        username
        email
        role
        score
      }
      score
    }
    currentUserEntry {
      position
      user {
        id
        username
        email
        role
        score
      }
      score
    }
  }
}
```
