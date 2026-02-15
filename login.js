const express = require('express');
const router = express.Router();
const db = require('../db');

// POST login
router.post('/', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM admins WHERE email=? AND password=?";

    db.query(sql, [email, password], (err, result) => {
        if (err) return res.status(500).send(err);

        if (result.length > 0) {
            res.json({ success: true, message: "Login success" });
        } else {
            res.json({ success: false, message: "Invalid email or password" });
        }
    });
});

module.exports = router;
