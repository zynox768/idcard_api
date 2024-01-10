// Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const mysql = require('mysql');
const cors = require('cors');

// Express App Initialization
const app = express();
const PORT = process.env.PORT || 4000;

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'id_card_system'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// Middleware Setup
app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit

// API Endpoint: Get All Details
app.get('/api/details', (req, res) => {
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching data from MySQL:', err);
            res.status(500).send('Error fetching data');
        } else {
            res.json(result);
        }
    });
});

// API Endpoint: Add ID Card Details
app.post('/api/idCard', upload.none(), (req, res) => {
    const { name, dob, bloodGroup, id } = req.body;

    const sql = 'INSERT INTO users (name, dob, bloodGroup, user_id) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, dob, bloodGroup, id], (err, result) => {
        if (err) {
            console.error('Error inserting data into MySQL:', err);
            res.status(500).send('Error storing data');
        } else {
            res.status(200).send('Data stored successfully');
        }
    });
});

// API Endpoint: Verify ID and Record Attendance
app.post("/api/verify", (req, res) => {
    const { id } = req.body;

    const getUserSql = 'SELECT * FROM users WHERE user_id = ?';
    db.query(getUserSql, [id], (err, users) => {
        if (err) {
            console.error('Error fetching user from MySQL:', err);
            res.status(500).json({ message: 'Error verifying ID' });
        } else if (users.length > 0) {
            const user = users[0];

            // Get current date and time
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const formattedToday = `${day}-${month}-${year}`;
            const currentTime = new Date().toLocaleTimeString('en-IN', { hour12: true });

            // Check attendance for the user on the current date
            const checkAttendanceSql = 'SELECT * FROM attendance WHERE user_id = ? AND date = ?';
            db.query(checkAttendanceSql, [user.id, formattedToday], (err, attendance) => {
                if (err) {
                    console.error('Error fetching attendance from MySQL:', err);
                    res.status(500).json({ message: 'Error verifying ID' });
                } else if (attendance.length < 3) {
                    // Insert attendance record if less than 3 scans for the day
                    const insertAttendanceSql = 'INSERT INTO attendance (user_id, time, date) VALUES (?, ?, ?)';
                    db.query(insertAttendanceSql, [user.id, currentTime, formattedToday], (err) => {
                        if (err) {
                            console.error('Error inserting attendance into MySQL:', err);
                            res.status(500).json({ message: 'Error verifying ID' });
                        } else {
                            res.json({ message: `Scan recorded for ID ${id}`, user });
                        }
                    });
                } else {
                    res.json({ message: `Card has already been scanned three times today for ID ${id}`, user });
                }
            });
        } else {
            res.status(404).json({ message: `No match found for ID ${id}` });
        }
    });
});

// API Endpoint: Attendance Report
app.post("/api/attendanceReport", upload.none(), (req, res) => {
    const { user_id } = req.body;

    // Validate input
    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required in the request body.' });
    }
    // Fetch user details
    const getUserSql = 'SELECT * FROM users WHERE user_id = ?';
    db.query(getUserSql, [user_id], (err, users) => {
        if (err) {
            console.error('Error fetching user from MySQL:', err);
            res.status(500).json({ message: 'Error fetching user details' });
        } else if (users.length > 0) {
            const user = users[0];

            // Fetch attendance report for the user
            const getAttendanceSql = 'SELECT * FROM attendance WHERE user_id = ?';
            db.query(getAttendanceSql, [user.id], (err, attendance) => {
                if (err) {
                    console.error('Error fetching attendance from MySQL:', err);
                    res.status(500).json({ message: 'Error fetching attendance report' });
                } else {
                    res.json({ user, attendance });
                }
            });
        } else {
            res.status(404).json({ message: `No match found for user ID ${user_id}` });
        }
    });
});



// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
