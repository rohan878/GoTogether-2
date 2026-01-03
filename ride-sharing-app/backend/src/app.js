const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// we'll create ./routes/index.js later
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "GoTogether API running 🚗" });
});

// all APIs under /api
app.use("/api", routes);

module.exports = app;
