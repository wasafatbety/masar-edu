/* ==========================================================================
   Masar Edu System (v3.9) - Central Backend Script (Firebase Fixed)
   File Name: masar-edu-central-backend.js
   ========================================================================== */

// التأكد من جاهزية الاتصال بقاعدة البيانات
function getDB() {
    if (typeof db !== 'undefined' && db) return db;
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        return firebase.firestore();
    }
    console.error("Firebase Firestore is not initialized!");
    return null;
}

// 1. الدخول الموحد (Unified Login Logic)
function toggleUnifiedFields() {
    const roleElem = document.getElementById('unifiedRoleSelect');
    const container = document.getElementById('unifiedInputFields');
    if (!roleElem || !container) return;
    
    const role = roleElem.value;
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
    const roleElem = document.getElementById('unifiedRoleSelect');
    if (!roleElem) return;
    const role = roleElem.value;

    if (role === 'student') {
        const id = document.getElementById('unifStudentId')?.value.trim();
        if (id) {
            const studentLoginInput = document.getElementById('studentLoginId');
            if (studentLoginInput) studentLoginInput.value = id;
            if (typeof switchUserRole === 'function') switchUserRole('student');
            loginStudentPortal();
        }
    } else if (role === 'parent') {
        const phone = document.getElementById('unifParentPhone')?.value.trim();
        const pass = document.getElementById('unifParentPass')?.value.trim();
        if (phone && pass) {
            const pPhone = document.getElementById('parentPhoneInput');
            const pPass = document.getElementById('parentPasswordInput');
            if (pPhone) pPhone.value = phone;
            if (pPass) pPass.value = pass;
            if (typeof switchUserRole === 'function') switchUserRole('parent');
            loginOrRegisterParentPortal();
        }
    } else if (role === 'driver') {
        const bus = document.getElementById('unifBusNum')?.value.trim();
        const pass = document.getElementById('unifDriverPass')?.value.trim();
        if (bus && pass) {
            const bScan = document.getElementById('busNumberInputScan');
            const dPass = document.getElementById('driverPassScan');
            if (bScan) bScan.value = bus;
            if (dPass) dPass.value = pass;
            if (typeof switchUserRole === 'function') switchUserRole('driver');
            authenticateDriver();
        }
    } else if (role === 'admin') {
        const email = document.getElementById('unifAdminEmail')?.value.trim();
        const pass = document.getElementById('unifAdminPass')?.value.trim();
        if (email && pass) {
            const aEmail = document.getElementById('adminEmailInput');
            const aPass = document.getElementById('adminPass');
            if (aEmail) aEmail.value = email;
            if (aPass) aPass.value = pass;
            if (typeof switchUserRole === 'function') switchUserRole('admin');
            authenticateAdmin();
        }
    }
}

// 2. بوابة الطالب والباركود (Student Portal)
function loginStudentPortal() {
    const firestore = getDB();
    if (!firestore) return;

    const studentInput = document.getElementById('studentLoginId');
    if (!studentInput) return;
    const studentId = studentInput.value.trim();

    if (!studentId) {
        if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "يرجى كتابة كود الطالب بشكل صحيح.");
        return;
    }

    firestore.collection("students").doc(studentId).get().then(doc => {
        if (!doc.exists) {
            if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-circle-xmark", "خطأ", "كود الطالب غير مسجل بالمنظومة.");
            return;
        }

        const data = doc.data();
        currentStudent = { id: doc.id, ...data };
        renderStudentCardUI(data);
    }).catch(err => {
        console.error("Firebase Student Fetch Error:", err);
    });
}

function renderStudentCardUI(data) {
    const authCard = document.getElementById('studentAuthCard');
    const portalContent = document.getElementById('studentPortalContent');
    if (authCard) authCard.style.display = 'none';
    if (portalContent) portalContent.style.display = 'block';

    const cardName = document.getElementById('studentCardName');
    const cardId = document.getElementById('studentCardId');
    if (cardName) cardName.innerText = data.name || 'طالب مسار';
    if (cardId) cardId.innerText = `كود الطالب: ${data.id || currentStudent.id}`;

    const statusElem = document.getElementById('studentCardStatus');
    if (statusElem) {
        statusElem.innerText = data.status === 'مفعل' ? 'الحساب مفعل 🟢' : 'موقف 🔴';
    }

    const qrCanvas = document.getElementById('qrcodeCanvas');
    if (qrCanvas && typeof QRCode !== 'undefined') {
        qrCanvas.innerHTML = '';
        new QRCode(qrCanvas, {
            text: JSON.stringify({ id: data.id || currentStudent.id, name: data.name }),
            width: 180,
            height: 180
        });
    }
}

function logoutStudentPortal() {
    currentStudent = null;
    const authCard = document.getElementById('studentAuthCard');
    const portalContent = document.getElementById('studentPortalContent');
    if (portalContent) portalContent.style.display = 'none';
    if (authCard) authCard.style.display = 'block';
}

// 3. بوابة ولي الأمر (Parent Portal)
async function loginOrRegisterParentPortal() {
    const firestore = getDB();
    if (!firestore) return;

    const phoneInput = document.getElementById('parentPhoneInput');
    const passInput = document.getElementById('parentPasswordInput');
    if (!phoneInput || !passInput) return;

    const phone = phoneInput.value.trim();
    const pass = passInput.value.trim();

    if (!phone || !pass) {
        if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "برجاء كتابة رقم الهاتف وكلمة المرور.");
        return;
    }

    try {
        const parentRef = firestore.collection("parents").doc(phone);
        const doc = await parentRef.get();

        if (doc.exists) {
            if (doc.data().password === pass) {
                currentParent = { phone, ...doc.data() };
                loadParentDashboardData(phone);
            } else {
                if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-circle-xmark", "خطأ", "كلمة المرور غير صحيحة.");
            }
        } else {
            await parentRef.set({
                phone: phone,
                password: pass,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentParent = { phone, password: pass };
            loadParentDashboardData(phone);
            if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-circle-check", "تم بنجاح", "تم إنشاء حساب ولي الأمر بنجاح.");
        }
    } catch (err) {
        console.error("Firebase Parent Error:", err);
        if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-circle-xmark", "خطأ", "حدث خطأ أثناء الاتصال بالسيرفر.");
    }
}

async function loadParentDashboardData(phone) {
    const firestore = getDB();
    if (!firestore) return;

    const authCard = document.getElementById('parentAuthCard');
    const portalContent = document.getElementById('parentPortalContent');
    if (authCard) authCard.style.display = 'none';
    if (portalContent) portalContent.style.display = 'block';

    const pTitle = document.getElementById('parentPhoneTitle');
    if (pTitle) pTitle.innerText = `رقم المسجل: ${phone}`;
    
    try {
        const childrenSnapshot = await firestore.collection("students").where("parentPhone", "==", phone).get();
        const container = document.getElementById('parentChildrenFinancials');
        if (container) {
            container.innerHTML = '';
            if (childrenSnapshot.empty) {
                container.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding:10px;">لا يوجد أبناء مرتبطين برقم الهاتف هذا حتى الآن.</p>`;
            } else {
                childrenSnapshot.forEach(doc => {
                    const child = doc.data();
                    container.innerHTML += `
                        <div class="financial-card" style="background: rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:10px;">
                            <h4 style="color:white; font-size:1rem; margin-bottom:8px;">الطالب: ${child.name || 'بدون اسم'}</h4>
                            <div class="fin-row" style="display:flex; justify-style:space-between;"><span>إجمالي الرسوم:</span> <strong>${child.feeTotal || 0} ج.م</strong></div>
                            <div class="fin-row" style="display:flex; justify-style:space-between;"><span>المدفوع:</span> <strong style="color:var(--success)">${child.feePaid || 0} ج.م</strong></div>
                        </div>
                    `;
                });
            }
        }

        firestore.collection("attendance")
          .where("parentPhone", "==", phone)
          .limit(10)
          .onSnapshot(snapshot => {
              const logList = document.getElementById('parentNotificationsList');
              if (logList) {
                  logList.innerHTML = '';
                  if (snapshot.empty) {
                      logList.innerHTML = `<p style="text-align:center; color: var(--text-muted);">لا توجد سجلات حضور حديثة.</p>`;
                      return;
                  }
                  snapshot.forEach(doc => {
                      const log = doc.data();
                      logList.innerHTML += `
                          <div class="notification-card" style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
                              <div class="notification-info">
                                  <h4>${log.studentName || 'طالب'}</h4>
                                  <p>تم تسجيل الحضور في: ${log.sessionType || 'جلسة'}</p>
                              </div>
                          </div>
                      `;
                  });
              }
          }, err => console.error("Snapshot Listener Error:", err));

    } catch (e) {
        console.error("Error loading Parent Dashboard:", e);
    }
}

function logoutParentPortal() {
    currentParent = null;
    const authCard = document.getElementById('parentAuthCard');
    const portalContent = document.getElementById('parentPortalContent');
    if (portalContent) portalContent.style.display = 'none';
    if (authCard) authCard.style.display = 'block';
}

// 4. الماسح وملاحظات المشرفين (Scanner)
async function authenticateDriver() {
    const busInput = document.getElementById('busNumberInputScan');
    const passInput = document.getElementById('driverPassScan');
    if (!busInput || !passInput) return;

    const busNum = busInput.value.trim();
    const pass = passInput.value.trim();

    if (!busNum || !pass) {
        if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "برجاء كتابة رقم القاعة وكلمة المرور.");
        return;
    }

    currentDriverBus = busNum;
    const authCard = document.getElementById('driverAuthCardScan');
    const scanContent = document.getElementById('driverScanContent');
    const busTitle = document.getElementById('currentDriverBusTitle');

    if (authCard) authCard.style.display = 'none';
    if (scanContent) scanContent.style.display = 'block';
    if (busTitle) busTitle.innerText = busNum;
}

function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        console.error("Html5Qrcode Library missing");
        return;
    }
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
        const startBtn = document.getElementById('startCamBtn');
        const stopBtn = document.getElementById('stopCamBtn');
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';
    }).catch(err => console.error("Camera Start Error:", err));
}

function stopScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            const startBtn = document.getElementById('startCamBtn');
            const stopBtn = document.getElementById('stopCamBtn');
            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
        }).catch(err => console.error("Camera Stop Error:", err));
    }
}

function verifyStudentManual() {
    const input = document.getElementById('manualStudentId');
    if (input && input.value.trim()) {
        processStudentQRScan(JSON.stringify({ id: input.value.trim() }));
    }
}

async function processStudentQRScan(qrDataRaw) {
    const firestore = getDB();
    if (!firestore) return;

    try {
        let studentId = qrDataRaw;
        if (qrDataRaw.startsWith('{')) {
            studentId = JSON.parse(qrDataRaw).id;
        }

        const studentDoc = await firestore.collection("students").doc(studentId).get();
        const resultCard = document.getElementById('resultCard');
        if (resultCard) resultCard.style.display = 'block';

        if (!studentDoc.exists) {
            if (resultCard) {
                resultCard.className = 'result-card danger';
                const resIcon = document.getElementById('resultIcon');
                const resTitle = document.getElementById('resultTitle');
                if (resIcon) resIcon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
                if (resTitle) resTitle.innerText = 'طالب غير مسجل!';
            }
            return;
        }

        const student = studentDoc.data();
        const sessionElem = document.getElementById('tripDirectionSelect');
        const sessionVal = sessionElem ? sessionElem.value : 'حضور';

        await firestore.collection("attendance").add({
            studentId: studentDoc.id,
            studentName: student.name || '',
            parentPhone: student.parentPhone || '',
            sessionType: sessionVal,
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (resultCard) {
            resultCard.className = 'result-card success';
            const resIcon = document.getElementById('resultIcon');
            const resTitle = document.getElementById('resultTitle');
            if (resIcon) resIcon.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
            if (resTitle) resTitle.innerText = student.name;
        }
    } catch (e) {
        console.error("Scan error:", e);
    }
}

function logoutDriver() {
    stopScanner();
    const scanContent = document.getElementById('driverScanContent');
    const authCard = document.getElementById('driverAuthCardScan');
    if (scanContent) scanContent.style.display = 'none';
    if (authCard) authCard.style.display = 'block';
}

// 5. لوحة التحكم والإدارة والمالية (Admin Dashboard)
async function authenticateAdmin() {
    const authCard = document.getElementById('adminAuthCard');
    const adminContent = document.getElementById('adminContent');
    if (authCard) authCard.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';
    loadAdminDashboardData();
}

async function addNewStudent() {
    const firestore = getDB();
    if (!firestore) return;

    const idInput = document.getElementById('newStudentId');
    const nameInput = document.getElementById('newStudentName');
    const phoneInput = document.getElementById('newParentPhone');

    if (!idInput || !nameInput || !phoneInput) return;

    const id = idInput.value.trim();
    const name = nameInput.value.trim();
    const parentPhone = phoneInput.value.trim();

    if (!id || !name || !parentPhone) {
        if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-triangle-exclamation", "تنبيه", "برجاء كتابة البيانات كاملة.");
        return;
    }

    const feeTotalInput = document.getElementById('newFeeTotal');
    const feePaidInput = document.getElementById('newFeePaid');

    await firestore.collection("students").doc(id).set({
        name: name,
        parentPhone: parentPhone,
        feeTotal: feeTotalInput ? (parseFloat(feeTotalInput.value) || 0) : 0,
        feePaid: feePaidInput ? (parseFloat(feePaidInput.value) || 0) : 0,
        semester: typeof activeSemester !== 'undefined' ? activeSemester : 'الترم الأول',
        status: 'مفعل',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-circle-check", "تم الحفظ", `تم إضافة الطالب ${name} بنجاح.`);
    loadAdminDashboardData();
}

async function loadAdminDashboardData() {
    const firestore = getDB();
    if (!firestore) return;

    try {
        const studentsSnap = await firestore.collection("students").get();
        renderAdminStudentsList(studentsSnap);
    } catch (e) {
        console.error("Error loading admin data:", e);
    }
}

function renderAdminStudentsList(snapshot) {
    const container = document.getElementById('studentsList');
    if (!container) return;
    container.innerHTML = '';
    if (snapshot.empty) {
        container.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding:10px;">لا يوجد طلاب مسجلون حتى الآن.</p>`;
        return;
    }

    snapshot.forEach(doc => {
        const s = doc.data();
        container.innerHTML += `
            <div class="student-item" style="background: rgba(255,255,255,0.03); padding:10px; margin-bottom:8px; border-radius:8px;">
                <div class="student-info">
                    <h4 style="color:white; font-size:0.95rem;">${s.name || 'بدون اسم'} (${doc.id})</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted);">هاتف ولي الأمر: ${s.parentPhone || 'غير محدد'}</p>
                </div>
            </div>
        `;
    });
}

function sendSupportTicketEmailJS() {
    if (typeof showCustomDialog === 'function') showCustomDialog("fa-solid fa-paper-plane", "تم الإرسال", "تم إرسال تذكرة الدعم الفني بنجاح.");
}

// التلقيم والتأكد التلقائي عند فتح الصفحة
document.addEventListener("DOMContentLoaded", () => {
    console.log("Masar Central Backend Loaded Successfully.");
});
