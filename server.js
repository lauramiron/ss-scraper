import express from "express";
import { netflixRouter } from "./services/netflix/routes.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.API_KEY) return res.status(401).send("unauthorized");
  next();
});

app.use("/netflix", netflixRouter);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on ${port}`));
