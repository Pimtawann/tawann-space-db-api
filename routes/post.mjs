import { Router } from "express";
import connectionPool from "../utils/db.mjs";
import protectAdmin from "../middleware/protectAdmin.mjs";
import validatePostData from "../middleware/postValidation.mjs";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const postRouter = Router();

const multerUpload = multer({ storage: multer.memoryStorage() });

const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

postRouter.post("/", [imageFileUpload, protectAdmin], async (req, res) => {
  try {
    const newPost = req.body;
    const file = req.files.imageFile[0];
    
    if (!file) {
        return res.status(400).json({ error: "Image file is required." });
      }

    const bucketName = "tawann-space";
    const ext = file.mimetype.split("/")[1] || "bin";
    const filePath = `posts/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path);

    await connectionPool.query(
      `INSERT INTO posts (title, image, category_id, description, content, status_id)
            VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newPost.title,
        publicUrl,
        newPost.category_id,
        newPost.description,
        newPost.content,
        newPost.status_id,
      ]
    );

    return res.status(201).json({ message: "Created post successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server could not create post because database connection",
      error: err.message,
    });
  }
});

postRouter.get("/", async (req, res) => {
  try {
    const category = req.query.category || "";
    const keyword = req.query.keyword || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const offset = (safePage - 1) * safeLimit;

    let query = `SELECT posts.id, posts.image, categories.name AS category, posts.title,
        posts.description, posts.date, posts.content, statuses.status, posts.likes_count
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id`;

    let values = [];

    if (category && keyword) {
      query += ` WHERE categories.name ILIKE $1 AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)`;
      values = [`%${category}%`, `%${keyword}%`];
    } else if (category) {
      query += ` WHERE categories.name ILIKE $1`;
      values = [`%${category}%`];
    } else if (keyword) {
      query += ` WHERE posts.title ILIKE $1 OR posts.description ILIKE $1 OR posts.content ILIKE $1`;
      values = [`%${keyword}%`];
    }

    query += ` ORDER BY posts.date DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;
    values.push(safeLimit, offset);

    const result = await connectionPool.query(query, values);

    let countQuery = `
        SELECT COUNT(*)
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
        `;
    let countValues = values.slice(0, -2);

    if (category && keyword) {
      countQuery += ` 
            WHERE categories.name ILIKE $1
            AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)`;
    } else if (category) {
      countQuery += ` WHERE categories.name ILIKE $1`;
    } else if (keyword) {
      countQuery += ` 
            WHERE posts.title ILIKE $1
            OR posts.description ILIKE $1
            OR posts.content ILIKE $1`;
    }

    const countResult = await connectionPool.query(countQuery, countValues);
    const totalPosts = parseInt(countResult.rows[0].count, 10);

    const results = {
      totalPosts,
      totalPages: Math.ceil(totalPosts / safeLimit),
      currentPage: safePage,
      limit: safeLimit,
      posts: result.rows,
    };

    // เช็คว่ามีหน้าถัดไปหรือไม่
    if (offset + safeLimit < totalPosts) {
      results.nextPage = safePage + 1;
    }

    // เช็คว่ามีหน้าก่อนหน้าหรือไม่
    if (offset > 0) {
      results.previousPage = safePage - 1;
    }

    return res.status(200).json(results);
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});

postRouter.get("/:postId", async (req, res) => {
  const postIdFromClient = req.params.postId;

  try {
    const results = await connectionPool.query(
      `
            SELECT posts.id, posts.image, categories.name AS category, posts.title, posts.description, posts.date, posts.content, statuses.status, posts.likes_count
            FROM posts
            INNER JOIN categories ON posts.category_id = categories.id
            INNER JOIN statuses ON posts.status_id = statuses.id
            WHERE posts.id = $1`,
      [postIdFromClient]
    );

    if (!results.rows[0]) {
      return res.status(404).json({
        message: "Server could not find a requested post",
      });
    }

    return res.status(200).json({ data: results.rows[0] });
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});

postRouter.put(
  "/:postId",
  [validatePostData, protectAdmin],
  async (req, res) => {
    const postIdFromClient = req.params.postId;
    const updatedPost = { ...req.body, date: new Date() };

    try {
      const results = await connectionPool.query(
        `
            UPDATE posts
            SET title = $2,
                image = $3,
                category_id = $4,
                description = $5,
                content = $6,
                status_id = $7,
                date = $8
            WHERE id = $1
            `,
        [
          postIdFromClient,
          updatedPost.title,
          updatedPost.image,
          updatedPost.category_id,
          updatedPost.description,
          updatedPost.content,
          updatedPost.status_id,
          updatedPost.date,
        ]
      );

      return res.status(200).json({
        message: "Updated post successfully",
      });
    } catch {
      return res.status(500).json({
        message: "Server could not update post because database connection",
      });
    }
  }
);

postRouter.delete("/:postId", protectAdmin, async (req, res) => {
  const postIdFromClient = req.params.postId;

  try {
    const results = await connectionPool.query(
      `
            DELETE FROM posts
            WHERE id = $1`,
      [postIdFromClient]
    );

    if (results.rowCount === 0) {
      return res.status(404).json({
        message: "Server could not find a requested post to delete",
      });
    }

    return res.status(200).json({
      message: "Deleted post successfully",
    });
  } catch {
    return res.status(500).json({
      message: "Server could not delete post because database connection",
    });
  }
});

postRouter.post("/:postId/like", async (req, res) => {
  const postIdFromClient = req.params.postId;

  try {
    const result = await connectionPool.query(
      `UPDATE posts
       SET likes_count = likes_count + 1
       WHERE id = $1
       RETURNING likes_count`,
      [postIdFromClient]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    return res.status(200).json({
      message: "Post liked successfully",
      likes_count: result.rows[0].likes_count,
    });
  } catch (error) {
    console.error("Error liking post:", error);
    return res.status(500).json({
      message: "Server could not like post because database connection",
    });
  }
});

postRouter.get("/:postId/comments", async (req, res) => {
  const postIdFromClient = req.params.postId;

  try {
    const result = await connectionPool.query(
      `SELECT comments.id, comments.comment_text, comments.created_at, users.username, users.profile_pic
       FROM comments
       INNER JOIN users ON comments.user_id = users.id
       WHERE comments.post_id = $1
       ORDER BY comments.created_at DESC`,
      [postIdFromClient]
    );

    return res.status(200).json({
      comments: result.rows,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({
      message: "Server could not fetch comments because database connection",
    });
  }
});

postRouter.post("/:postId/comments", async (req, res) => {
  const postIdFromClient = req.params.postId;
  const { content } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  try {
    // Verify user token
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const userId = userData.user.id;

    const result = await connectionPool.query(
      `INSERT INTO comments (post_id, user_id, comment_text, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, comment_text, created_at`,
      [postIdFromClient, userId, content.trim()]
    );

    const userInfo = await connectionPool.query(
      `SELECT username, profile_pic FROM users WHERE id = $1`,
      [userId]
    );

    return res.status(201).json({
      message: "Comment created successfully",
      comment: {
        ...result.rows[0],
        username: userInfo.rows[0].username,
        profile_pic: userInfo.rows[0].profile_pic,
      },
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({
      message: "Server could not create comment because database connection",
    });
  }
});

export default postRouter;
