const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/journal", require("./routes/journal"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/subscription", require("./routes/subscription"));
app.use("/api/payment-request", require("./routes/paymentRequest"));
app.use("/api/market-watch", require("./routes/marketWatch"));

app.get("/", (req, res) => {
  res.send("Trading Journal API Running...");
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
}

void startServer();
