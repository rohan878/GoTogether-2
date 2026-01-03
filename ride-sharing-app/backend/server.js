const { PORT } = require("./src/config/env");
const { connectDB } = require("./src/config/database");
const app = require("./src/app");

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 GoTogether backend on http://localhost:${PORT}`);
  });
};

startServer();
