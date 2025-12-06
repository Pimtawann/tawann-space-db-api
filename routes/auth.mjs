import { Router } from "express";
import connectionPool from "../utils/db.mjs";
import { createClient } from "@supabase/supabase-js";
import protectAdmin from "../middleware/protectAdmin.mjs";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const authRouter = Router();

authRouter.post("/register", async (req, res) => {
    const { email, password, username, name } = req.body;

    try {
        const usernameCheckQuery = `
        SELECT * FROM users
        WHERE username = $1
        `;

        const usernameCheckValues = [username];
        const { rows: existingUser } = await connectionPool.query(usernameCheckQuery, usernameCheckValues);

        if (existingUser.length > 0) {
            return res.status(400).json({ error: "This username is already taken" });
        };

        const { data, error: supabaseError } = await supabase.auth.signUp({
            email, password,
        });

        if (supabaseError) {
            if (supabaseError.code === "user_already_exists") {
                return res.status(400).json({ error: "Email is already taken, Please try another email."})
            }

            return res.status(400).json({ error: "Failed to create user. Please try again." })
        }

        const supabaseUserId = data.user.id;

        const query = `
        INSERT INTO users (id, username, name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `;

        const values = [supabaseUserId, username, name, "user"];

        const { rows } = await connectionPool.query(query, values);
        res.status(201).json({ message: "User created successfully", user: rows[0],})
    } catch (error) {
        res.status(500).json({ error: "An error occurred during registration" })

    }
})

authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            if (error.code === "invalid_credentials" || error.message.includes("Invalid login credentials")) {
                return res.status(400).json({ error: "Your password is incorrect or this email doesn't exist",})
            }
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json({
            message: "Signed in successfully",
            access_token: data.session.access_token
        });
    } catch (error) {
        return res.status(500).json({ error: "An error occurred during login" })
    }
});

authRouter.get("/get-user", async (req,res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Token missing" })
    }

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error) {
            return res.status(401).json({ error: "Unauthorized or token expired"})
        }

        const supabaseUserId = data.user.id;
        const query = `
        SELECT * FROM users
        WHERE id = $1
        `;

        const values = [supabaseUserId];
        const { rows } = await connectionPool.query(query, values);

        res.status(200).json({
            id: data.user.id,
            email: data.user.email,
            username: rows[0].username,
            name: rows[0].name,
            role: rows[0].role,
            profilePic: rows[0].profile_pic,
        })
    } catch (error) {
        res.status(500).json({ error: "Internal server error"})
    }
})

authRouter.put("/reset-password", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const { oldPassword, newPassword } = req.body;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Token missing" })
    }

    if (!newPassword) {
        return res.status(400).json({ error: "New password is required"})
    }

    try {
        const { data:userData, error:userError } = await supabase.auth.getUser(token);

        if (userError) {
            return res.status(401).json({ error: "Unauthorized: Invalid token" })
        }

        const { data:loginData, error:loginError } = await supabase.auth.signInWithPassword({
            email: userData.user.email,
            password: oldPassword,
        })

        if (loginError) {
            return res.status(400).json({ error: "Invalid old password" })
        }

        const { data, error } = await supabase.auth.updateUser({ password: newPassword, })

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.status(200).json({
            message: "Password updated successfully",
            user: data.user,
        })
    } catch (error) {
        res.status(500).json({ error: "Internal server error" })
    }
})

authRouter.put("/update-profile", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const { name, username, profilePic } = req.body;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Token missing" })
    }

    try {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);

        if (userError) {
            return res.status(401).json({ error: "Unauthorized: Invalid token" })
        }

        const userId = userData.user.id;

        // Check if username is taken by another user
        if (username) {
            const usernameCheckQuery = `
                SELECT * FROM users
                WHERE username = $1 AND id != $2
            `;
            const { rows: existingUser } = await connectionPool.query(usernameCheckQuery, [username, userId]);

            if (existingUser.length > 0) {
                return res.status(400).json({ error: "This username is already taken" });
            }
        }

        // Update user profile
        const updateQuery = `
            UPDATE users
            SET name = COALESCE($1, name),
                username = COALESCE($2, username),
                profile_pic = COALESCE($3, profile_pic)
            WHERE id = $4
            RETURNING *;
        `;

        const values = [name || null, username || null, profilePic || null, userId];
        const { rows } = await connectionPool.query(updateQuery, values);

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: rows[0].id,
                name: rows[0].name,
                username: rows[0].username,
                profilePic: rows[0].profile_pic,
                role: rows[0].role
            }
        })
    } catch (error) {
        res.status(500).json({ error: "Internal server error" })
    }
})

authRouter.get("/categories", async (req, res) => {
    const { rows } = await connectionPool.query("SELECT id, name FROM categories");
    res.status(200).json({ categories: rows })
})

authRouter.post("/categories", protectAdmin, async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
    }

    try {
        const { rows } = await connectionPool.query(
            "INSERT INTO categories (name) VALUES ($1) RETURNING *",
            [name.trim()]
        );
        res.status(201).json({
            message: "Category created successfully",
            category: rows[0]
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ error: "Failed to create category" });
    }
})

authRouter.put("/categories/:categoryId", protectAdmin, async (req, res) => {
    const { categoryId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
    }

    try {
        const { rows } = await connectionPool.query(
            "UPDATE categories SET name = $1 WHERE id = $2 RETURNING *",
            [name.trim(), categoryId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.status(200).json({
            message: "Category updated successfully",
            category: rows[0]
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Failed to update category" });
    }
})

authRouter.delete("/categories/:categoryId", protectAdmin, async (req, res) => {
    const { categoryId } = req.params;

    try {
        const { rows } = await connectionPool.query(
            "DELETE FROM categories WHERE id = $1 RETURNING *",
            [categoryId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Category not found" });
        }

        res.status(200).json({
            message: "Category deleted successfully",
            category: rows[0]
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Failed to delete category" });
    }
})

export default authRouter;