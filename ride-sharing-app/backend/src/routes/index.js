const express = require("express");
const router = express.Router();

// we will add authRoutes & scheduleRoutes here later
// const authRoutes = require("./authRoutes");
// const scheduleRoutes = require("./scheduleRoutes");

// router.use("/auth", authRoutes);
// router.use("/schedules", scheduleRoutes);

router.get("/ping", (req, res) => {
  res.json({ message: "API is alive ✅" });
});

module.exports = router;
