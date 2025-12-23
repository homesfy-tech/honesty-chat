module.exports = {
  apps: [
    {
      name: "homesfy-api",
      cwd: "/home/ec2-user/homesfy-chat/apps/api",
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production" }
    },
    {
      name: "homesfy-dashboard",
      cwd: "/home/ec2-user/homesfy-chat/apps/dashboard",
      script: "npm",
      args: "run dev",
      env: { NODE_ENV: "production" }
    },
    {
      name: "homesfy-widget",
      cwd: "/home/ec2-user/homesfy-chat/apps/widget",
      script: "npm",
      args: "run dev",
      env: { NODE_ENV: "production" }
    }
  ]
};

