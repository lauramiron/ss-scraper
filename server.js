import express from "express";
import { netflixRouter } from "./services/netflix/routes.js";

const app = express();
app.use(express.json());


const ALLOWED_IPS = (process.env.ALLOWED_IPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;

  // For debugging; remove later if noisy
  console.log("REQ", req.method, req.path, "from", ip);

  // 1️⃣  Allow whitelisted IPs
  if (ALLOWED_IPS.includes(ip)) {
    console.log("Allowed IP:", ip);
    console.log('PW version:', require('playwright/package.json').version);
    console.log(process.env.PLAYWRIGHT_BROWSERS_PATH);

    return next();
  } else {
    console.warn("Requiring x-api-key header from IP:", ip);
    const key = req.headers["x-api-key"];
    if (!key || key !== process.env.API_KEY) {
      console.warn("Bad/missing API key from", ip, "path:", req.path);
      return res.status(401).send("unauthorized");
    }
    else {
      next();
    }
  }
});

app.use("/netflix", netflixRouter);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on ${port}`));
