import express from "express";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

function randomToken(): string {
  return Math.random().toString(36).substr(2);
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("Google client id and secret must be set");
}

const prisma = new PrismaClient();
const app = express();
const port = 3000;

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send("Username and password are required");
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
    res.status(400).send({ error: "User not found" });
    return;
  }

  res.send(user);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send("Username and password are required");
    return;
  }

  const token = randomToken();

  const user = await prisma.user.create({
    data: {
      username,
      password,
      token,
    },
  });

  res.send(user);
});

app.get("/notes", async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    res.status(400).send("Authorization header is required");
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      token,
    },
    select: {
      notes: true,
      labels: true,
    },
  });

  if (!user) {
    res.status(400).send("Invalid token");
    return;
  }

  res.send({
    notes: user.notes,
    labels: user.labels,
  });
});

app.post("/notes", async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    res.status(400).send("Authorization header is required");
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      token,
    },
  });

  if (!user) {
    res.status(400).send("Invalid token");
    return;
  }

  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400).send("Title and description are required");
    return;
  }

  const highestIndex = await prisma.note.findFirst({
    where: {
      userId: user.id,
    },
    orderBy: {
      index: "desc",
    },
    select: {
      index: true,
    },
  });

  const note = await prisma.note.create({
    data: {
      index: highestIndex ? highestIndex.index + 1 : 0,
      title,
      description,
      color: "#141414",
      userId: user.id,
    },
  });

  res.send(note);
});

app.post("/notes/:id", async (req, res) => {
  const token = req.headers.authorization;
  const id = Number(req.params.id);

  if (!token) {
    res.status(400).send("Authorization header is required");
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      token,
    },
  });

  if (!user) {
    res.status(400).send("Invalid token");
    return;
  }

  const { title, description, pinned, archived, color, index } = req.body;

  const note = await prisma.note.update({
    where: {
      id: id,
    },
    data: {
      title,
      description,
      pinned,
      archived,
      color,
      index,
    },
  });

  res.send(note);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
