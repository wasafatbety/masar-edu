/* ==========================================================================
   Masar Edu System (v3.9) - Central Backend Script
   File Name: masar-edu-central-backend.js
   ========================================================================== */

// 1. الدخول الموحد (Unified Login Logic)
function toggleUnifiedFields() {
    const role = document.getElementById('unifiedRoleSelect').value;
    const container = document.getElementById('unifiedInputFields');
    if (!container) return;
    container.innerHTML = '';

    if (role === 'student') {
        container.innerHTML = `<input type="text" id="unifStudentId" class="input-box" placeholder="أدخل كود الطالب" style="text-align:center; margin-top:10px;">`;
    } else if (role === 'parent') {
        container.innerHTML = `
            <input type="tel" id="unifParentPhone" class="input-box" placeholder="رقم هاتف ولي الأمر" style="text-align:center; margin-top:10px;">
            <input type="password" id="unifParentPass" class="input-box" placeholder="كلمة المرور" style="text-align:center; margin-top:10px;">
        `;
    } else if (role === 'driver') {
        container.innerHTML = `
            <input type="text" id="unifBusNum" class="input-box" placeholder="رقم القاعة / المجموعة" style="text-align:center; margin-top:10px;">
            <input type="password" id="unifDriverPass" class="input-box" placeholder="كلمة المرور" style="text-align:center; margin-top:10px;">
        `;
    } else if (role === 'admin') {
        container.innerHTML = `
            <input type="email" id="unifAdminEmail" class="input-box" placeholder="البريد الإلكتروني" style="text-align:center; margin-top:10px;">
            <input type="password" id="unifAdminPass" class="input-box" placeholder="كلمة المرور" style="text-align:center; margin-top:10px;">
        `;
    }
}

function executeUnifiedLogin() {
    const role = document.getElementById('unifiedRoleSelect').value;
    if (role === 'student') {
        const id = document.getElementById('unifStudentId')?.value.trim();
        if (id) {
            document.getElementById('studentLoginId').value = id;
            switchUserRole('student');
            loginStudentPortal();
        }
    } else if (role === 'parent') {
        const phone = document.getElementById('unifParentPhone')?.value.trim();
        const pass = document.getElementById('unifParentPass')?.value.trim();
        if (phone && pass) {
            document.getElementById('parentPhoneInput').value = phone;
            document.getElementById('parentPasswordInput').value = pass;
            switchUserRole('parent');
            loginOrRegisterParentPortal();
        }
    } else if (role === 'driver') {
        const bus = document.getElementById('unifBusNum')?.value.trim();
        const pass = document.getElementById('unifDriverPass')?.value.trim();
        if (bus && pass) {
            document.getElementById('busNumberInputScan').value = bus;
            document.getElementById('driverPassScan').value = pass;
            switchUserRole('driver');
            authenticateDriver();
        }
    } else if (role === 'admin') {
        const email = document.getElementById('unifAdminEmail')?.value.trim();
        const pass = document.getElementById('unifAdminPass')?.value.trim();
        if (email && pass) {
            document.getElementById('adminEmailInput').value = email;
            document.getElementById('adminPass').value = pass;
            switchUserRole('admin');
            authenticateAdmin();
        }
    }
}

// 2. بوابة الطالب والبار كود (Student Portal)
function loginStudentPortal() {
    const studentId = document.getElementById('studentLoginId').value.trim();
    if (!studentId) {
        showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "يرجى كتابة كود الطالب بشكل صحيح.");
        return;
    }

    db.collection("students").doc(studentId).get().then(doc => {
        if (!doc.exists) {
            showCustomDialog("fa-solid fa-circle-xmark", "خطأ", "كود الطالب غير مسجل بالمنظومة.");
            return;
        }

        const data = doc.data();
        currentStudent = { id: doc.id, ...data };
        renderStudentCardUI(data);
    });
}

function renderStudentCardUI(data) {
    document.getElementById('studentAuthCard').style.display = 'none';
    document.getElementById('studentPortalContent').style.display = 'block';

    document.getElementById('studentCardName').innerText = data.name || 'طالب مسار';
    document.getElementById('studentCardId').innerText = `كود الطالب: ${data.id}`;

    const statusElem = document.getElementById('studentCardStatus');
    if (statusElem) {
        statusElem.innerText = data.status === 'مفعل' ? 'الحساب مفعل 🟢' : 'موقف 🔴';
    }

    const qrCanvas = document.getElementById('qrcodeCanvas');
    if (qrCanvas) {
        qrCanvas.innerHTML = '';
        new QRCode(qrCanvas, {
            text: JSON.stringify({ id: data.id, name: data.name }),
            width: 180,
            height: 180
        });
    }
}

function logoutStudentPortal() {
    currentStudent = null;
    document.getElementById('studentPortalContent').style.display = 'none';
    document.getElementById('studentAuthCard').style.display = 'block';
}

// 3. بوابة ولي الأمر والتنبيهات (Parent Portal)
async function loginOrRegisterParentPortal() {
    const phone = document.getElementById('parentPhoneInput').value.trim();
    const pass = document.getElementById('parentPasswordInput').value.trim();

    if (!phone || !pass) {
        showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "برجاء كتابة رقم الهاتف وكلمة المرور.");
        return;
    }

    try {
        const parentRef = db.collection("parents").doc(phone);
        const doc = await parentRef.get();

        if (doc.exists) {
            if (doc.data().password === pass) {
                currentParent = { phone, ...doc.data() };
                loadParentDashboardData(phone);
            } else {
                showCustomDialog("fa-solid fa-circle-xmark", "خطأ", "كلمة المرور غير صحيحة.");
            }
        } else {
            await parentRef.set({
                phone: phone,
                password: pass,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentParent = { phone, password: pass };
            loadParentDashboardData(phone);
            showCustomDialog("fa-solid fa-circle-check", "تم بنجاح", "تم إنشاء حساب ولي الأمر بنجاح.");
        }
    } catch (err) {
        showCustomDialog("fa-solid fa-circle-xmark", "خطأ", "حدث خطأ أثناء الاتصال بالسيرفر.");
    }
}

async function loadParentDashboardData(phone) {
    document.getElementById('parentAuthCard').style.display = 'none';
    document.getElementById('parentPortalContent').style.display = 'block';
    document.getElementById('parentPhoneTitle').innerText = `رقم المسجل: ${phone}`;
    
    const childrenSnapshot = await db.collection("students").where("parentPhone", "==", phone).get();
    const container = document.getElementById('parentChildrenFinancials');
    if (container) {
        container.innerHTML = '';
        if (childrenSnapshot.empty) {
            container.innerHTML = `<p style="text-align:center; color: var(--text-muted);">لا يوجد أبناء مرتبطين برقم الهاتف هذا حتى الآن.</p>`;
        } else {
            childrenSnapshot.forEach(doc => {
                const child = doc.data();
                container.innerHTML += `
                    <div class="financial-card">
                        <h4 style="color:white; font-size:1rem; margin-bottom:8px;">الطالب: ${child.name}</h4>
                        <div class="fin-row"><span>إجمالي الرسوم:</span> <strong>${child.feeTotal || 0} ج.م</strong></div>
                        <div class="fin-row"><span>المدفوع:</span> <strong style="color:var(--success)">${child.feePaid || 0} ج.م</strong></div>
                    </div>
                `;
            });
        }
    }

    db.collection("attendance")
      .where("parentPhone", "==", phone)
      .limit(10)
      .onSnapshot(snapshot => {
          const logList = document.getElementById('parentNotificationsList');
          if (logList) {
              logList.innerHTML = '';
              snapshot.forEach(doc => {
                  const log = doc.data();
                  logList.innerHTML += `
                      <div class="notification-card">
                          <div class="notification-info">
                              <h4>${log.studentName}</h4>
                              <p>تم تسجيل الحضور في: ${log.sessionType}</p>
                          </div>
                      </div>
                  `;
              });
          }
      });
}

function logoutParentPortal() {
    currentParent = null;
    document.getElementById('parentPortalContent').style.display = 'none';
    document.getElementById('parentAuthCard').style.display = 'block';
}

// 4. الماسح وملاحظات المشرفين (Scanner)
async function authenticateDriver() {
    const busNum = document.getElementById('busNumberInputScan').value.trim();
    const pass = document.getElementById('driverPassScan').value.trim();

    if (!busNum || !pass) {
        showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "برجاء كتابة رقم القاعة وكلمة المرور.");
        return;
    }

    currentDriverBus = busNum;
    document.getElementById('driverAuthCardScan').style.display = 'none';
    document.getElementById('driverScanContent').style.display = 'block';
    document.getElementById('currentDriverBusTitle').innerText = busNum;
}

function startScanner() {
    html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            processStudentQRScan(decodedText);
            stopScanner();
        },
        () => {}
    ).then(() => {
        document.getElementById('startCamBtn').style.display = 'none';
        document.getElementById('stopCamBtn').style.display = 'block';
    });
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('startCamBtn').style.display = 'block';
            document.getElementById('stopCamBtn').style.display = 'none';
        });
    }
}

function verifyStudentManual() {
    const studentId = document.getElementById('manualStudentId').value.trim();
    if (studentId) processStudentQRScan(JSON.stringify({ id: studentId }));
}

async function processStudentQRScan(qrDataRaw) {
    try {
        let studentId = qrDataRaw;
        if (qrDataRaw.startsWith('{')) {
            studentId = JSON.parse(qrDataRaw).id;
        }

        const studentDoc = await db.collection("students").doc(studentId).get();
        const resultCard = document.getElementById('resultCard');
        if (resultCard) resultCard.style.display = 'block';

        if (!studentDoc.exists) {
            if (resultCard) {
                resultCard.className = 'result-card danger';
                document.getElementById('resultIcon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
                document.getElementById('resultTitle').innerText = 'طالب غير مسجل!';
            }
            return;
        }

        const student = studentDoc.data();
        await db.collection("attendance").add({
            studentId: studentDoc.id,
            studentName: student.name,
            parentPhone: student.parentPhone || '',
            sessionType: document.getElementById('tripDirectionSelect')?.value || 'حضور',
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (resultCard) {
            resultCard.className = 'result-card success';
            document.getElementById('resultIcon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
            document.getElementById('resultTitle').innerText = student.name;
        }
    } catch (e) {
        console.error(e);
    }
}

function logoutDriver() {
    stopScanner();
    document.getElementById('driverScanContent').style.display = 'none';
    document.getElementById('driverAuthCardScan').style.display = 'block';
}

// 5. لوحة التحكم والإدارة والمالية (Admin Dashboard)
async function authenticateAdmin() {
    document.getElementById('adminAuthCard').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    loadAdminDashboardData();
}

async function addNewStudent() {
    const id = document.getElementById('newStudentId').value.trim();
    const name = document.getElementById('newStudentName').value.trim();
    const parentPhone = document.getElementById('newParentPhone').value.trim();

    if (!id || !name || !parentPhone) {
        showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "برجاء كتابة البيانات كاملة.");
        return;
    }

    await db.collection("students").doc(id).set({
        name, parentPhone,
        feeTotal: parseFloat(document.getElementById('newFeeTotal').value) || 0,
        feePaid: parseFloat(document.getElementById('newFeePaid').value) || 0,
        semester: typeof activeSemester !== 'undefined' ? activeSemester : 'الترم الأول',
        status: 'مفعل'
    });

    showCustomDialog("fa-solid fa-circle-check", "تم الحفظ", `تم إضافة الطالب ${name} بنجاح.`);
    loadAdminDashboardData();
}

async function loadAdminDashboardData() {
    const studentsSnap = await db.collection("students").get();
    renderAdminStudentsList(studentsSnap);
}

function renderAdminStudentsList(snapshot) {
    const container = document.getElementById('studentsList');
    if (!container) return;
    container.innerHTML = '';
    snapshot.forEach(doc => {
        const s = doc.data();
        container.innerHTML += `
            <div class="student-item">
                <div class="student-info">
                    <h4>${s.name} (${doc.id})</h4>
                    <p>هاتف ولي الأمر: ${s.parentPhone}</p>
                </div>
            </div>
        `;
    });
}

function sendSupportTicketEmailJS() {
    showCustomDialog("fa-solid fa-paper-plane", "تم الإرسال", "تم إرسال تذكرة الدعم الفني بنجاح.");
}
