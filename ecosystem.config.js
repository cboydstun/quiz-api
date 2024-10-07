module.exports = {
    apps: [{
      name: "quiz-api",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      },
      node_args: "--max-old-space-size=4096"
    }]
  };