const express = require('express');
const { Client } = require('pg');
const app = express();
const path = require('path');

// ตั้งค่าให้ Express อ่านค่าแบบ URL Encoded
app.use(express.urlencoded({ extended: true }));


// ตั้งค่า EJS เป็น view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// เสิร์ฟไฟล์ static
app.use(express.static(path.join(__dirname, 'public')));


// การตั้งค่าฐานข้อมูล PostgreSQL
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'checkname',  // เปลี่ยนตามฐานข้อมูลของคุณ
    password: '1234',         // เปลี่ยนเป็นรหัสผ่านจริง
    port: 5433,               // ตรวจสอบว่า port ถูกต้องหรือไม่
});

client.connect((err) => {
    if (err) {
        console.error('Failed to connect to the database', err.stack);
    } else {
        console.log('Connected to the database');
    }
});


// หน้า index.ejs สำหรับเช็คชื่อ
app.get('/', (req, res) => {
    const successMessage = req.query.success === '1' ? 'Check-in successful!' : null;

    client.query('SELECT * FROM section', (err, result) => {
        if (err) {
            console.error('Error fetching sections', err.stack);
            res.render('index', { error: 'Error loading sections.', success: null, sections: [] });
        } else {
            res.render('index', { error: null, success: successMessage, sections: result.rows });
        }
    });
});

// เส้นทางสำหรับการเช็คชื่อ (POST)
app.post('/check-in', (req, res) => {
    const { student_id, first_name, last_name, section_id } = req.body;
    const checkin_date = new Date();

    // ค้นหานักศึกษาในฐานข้อมูลตาม student_id, first_name และ last_name
    client.query(`SELECT id, curriculum_id FROM student WHERE id = $1 AND first_name = $2 AND last_name = $3`, 
    [student_id, first_name, last_name], (err, result) => {
        if (err || result.rows.length === 0) {
            console.error('Student not found', err);
            res.redirect('/?success=0');  // redirect พร้อมส่งค่า success=0 หากไม่พบข้อมูล
        } else {
            const student_id = result.rows[0].id;

            // บันทึกการเช็คชื่อใน student_list โดยใช้ checkin_date
            client.query(
                `INSERT INTO student_list (section_id, student_id, active_date, checkin_date, status) 
                 VALUES ($1, $2, CURRENT_DATE, $3, 'active')`,
                [section_id, student_id, checkin_date],
                (err) => {
                    if (err) {
                        console.error('Error inserting check-in data', err.stack);
                        res.redirect('/?success=0');
                    } else {
                        res.redirect('/?success=1');  // redirect พร้อมส่งค่า success=1 หากบันทึกสำเร็จ
                    }
                }
            );
        }
    });
});



// เส้นทางแสดงรายชื่อการเช็คชื่อ (namestd.ejs)
app.get('/namestd', (req, res) => {
    client.query(`
        SELECT 
            student.id,
            prefix.prefix, 
            student.first_name,
            student.last_name,
            section.section,
            curriculum.curr_name_th,
            curriculum.curr_name_en,
            curriculum.short_name_th,
            curriculum.short_name_en,
            student_list.checkin_date 
            FROM student_list
            JOIN student ON student_list.student_id = student.id
            JOIN prefix ON student.prefix_id = prefix.id
            JOIN section ON student_list.section_id = section.id
            JOIN curriculum ON student.curriculum_id = curriculum.id
            ORDER BY student_list.checkin_date DESC`, (err, result) => {
            if (err) {
                console.error('Error fetching attendance data', err.stack);
                res.render('index', { error: 'Error retrieving attendance records.', success: null, sections: [] });
            } else {
                res.render('namestd', { attendance: result.rows });
            }
        });
});



// ตั้งค่าพอร์ต
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});









