const express = require('express');
const app = express();
const mysql = require('mysql');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const crypto = require('crypto');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'lehuyhung201',
    database: 'mdc_test'
});

connection.connect((err) => {
    if (err) throw err; 
    console.log('Kết nối database thành công!');
    connection.query(`
        SELECT * FROM information_schema.tables 
        WHERE table_schema = 'mdc_test' 
        AND table_name = 'user'
    `, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            console.log('Bảng "user" đã tồn tại trong cơ sở dữ liệu "mdc_test"');
            startServer();
        } else {
            createTableAndInsertData();
        }
    });
});

function createTableAndInsertData() {
    connection.query(`
        CREATE TABLE IF NOT EXISTS user (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            loggedIn INT DEFAULT 0,
            loggedAt DATETIME DEFAULT NULL
        )
    `, (err, result) => {
        if (err) throw err;
        console.log('Tạo bảng thành công!');
        insertUserRecords();
        startServer();
    });
}

function startServer() {
    app.post('/login', (req, res) => {
        const { username } = req.body;

        connection.query(`
            SELECT * FROM user WHERE username = ?
        `, [username], (err, result) => {
            if (err) {
                console.error("Lỗi SQL:", err); // In ra lỗi SQL
                res.status(500).json({ error: 'Lỗi truy vấn cơ sở dữ liệu' });
            } else {
                if (result.length > 0) {
                    res.json({ exists: true });
                } else {
                    res.json({ exists: false });
                }
            }
        });
    });

    app.listen(4000, () => {
        console.log('Server đang lắng nghe trên cổng 4000');
    });
}


function generateRandomUsername() {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let username = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        username += characters[randomIndex];
    }
    return username;
}

function generateRandomPassword() {
    const digits = '0123456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        password += digits[randomIndex];
    }
    return crypto.createHash('sha256').update(password).digest('hex');
}

function insertUserRecords() {
    const usernames = new Set();
    const records = [];
    const insertSize = 100000;

    while (usernames.size < 1000000) {
        username = generateRandomUsername();
        if (!usernames.has(username)) {
            const password = generateRandomPassword();
            const record = [username, password, 0, null];
            records.push(record);
            usernames.add(username);
        }
        if (records.length === insertSize) {
            connection.query('INSERT INTO user (username, password, loggedIn, loggedAt) VALUES ?', [records], (err, result) => {
                if (err) throw err;
                console.log('Insert thành công!');
            });
            records.length = 0;
        }
    }
}
