require('dotenv').config();
const db = require('./config/database');
const assignmentService = require('./services/assignmentService');
const fs = require('fs');
const path = require('path');

async function diagnose() {
    let output = '--- DEEP DIAGNOSIS START ---\n';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        // 1. Get most recent pending booking
        const bookingRes = await db.query("SELECT * FROM bookings WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1");
        if (bookingRes.rows.length === 0) {
            log('❌ No pending bookings found.');
            return;
        }
        const booking = bookingRes.rows[0];
        log(`Booking: ${booking.booking_reference} (ID: ${booking.id})`);
        log(`- Tenant: ${booking.tenant_id}`);
        log(`- Pickup: ${booking.scheduled_pickup_time}`);

        // Check requirement
        const reqRes = await db.query("SELECT * FROM booking_requirements WHERE booking_id = $1", [booking.id]);
        let vehicleType = 'sedan';
        if (reqRes.rows.length > 0 && reqRes.rows[0].vehicle_type) {
            vehicleType = reqRes.rows[0].vehicle_type;
        }
        log(`- Required Vehicle Type: ${vehicleType}`);

        // 2. Find eligible drivers
        const dateObj = new Date(booking.scheduled_pickup_time);
        const dayOfWeek = dateObj.getDay();
        const timeStr = dateObj.toTimeString().split(' ')[0];
        log(`- Searching for: Day ${dayOfWeek}, Time ${timeStr}`);

        const driversRes = await db.query(`
            SELECT d.id, u.first_name, d.status as d_status, u.status as u_status, v.vehicle_type, u.tenant_id
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            JOIN vehicles v ON d.vehicle_id = v.id
            WHERE u.tenant_id = $1
        `, [booking.tenant_id]);

        log(`- Potential drivers in same tenant (${booking.tenant_id}): ${driversRes.rows.length}`);
        for (const d of driversRes.rows) {
            log(`  > Driver ${d.id} (${d.first_name}): Status=${d.d_status}, UserStatus=${d.u_status}, Vehicle=${d.vehicle_type}`);

            // Check schedule
            const schedRes = await db.query("SELECT * FROM driver_schedules WHERE driver_id = $1 AND day_of_week = $2", [d.id, dayOfWeek]);
            if (schedRes.rows.length === 0) {
                log(`    ❌ No schedule for day ${dayOfWeek}`);
            } else {
                const s = schedRes.rows[0];
                log(`    📅 Sched: ${s.start_time} - ${s.end_time}, Active: ${s.is_active}`);
                if (timeStr < s.start_time || timeStr > s.end_time) log(`    ❌ Time mismatch (${timeStr} not in ${s.start_time}-${s.end_time})`);
            }
        }

        // 3. Dry run assignment
        log('\n--- DRY RUN ASSIGNMENT ---');
        try {
            const result = await assignmentService.assignBooking(booking.id);
            log('Result: ' + JSON.stringify(result, null, 2));
        } catch (e) {
            log('Assignment Error: ' + e.message);
            log(e.stack);
        }

    } catch (err) {
        log('Fatal: ' + err.message);
    } finally {
        fs.writeFileSync(path.join(__dirname, 'diag_final.txt'), output);
        process.exit();
    }
}

diagnose();
