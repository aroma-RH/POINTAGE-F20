let groupData = {};
let selectedGroup = '';
let selectedMembers = new Set();
let memberHours = {};
let isOnline = navigator.onLine;


const h12 = ["4116", "456", "1648" ,"4029" ];
const h9 = ["7416", "12419", "19939", "26730", "27399", "30609", "37079", "40183", "38774", "41294", "44943", "28679", "58451","34372"];
const h10 = ["4236", "7694", "13536", "15062","23825", "28541", "29730", "45894", "48337", "41371"];
const fix = ["69", "1829", "4263", "12488", "14829", "21477", "27496", "28055", "57281", "52206", "32781", "33567", "36435", "36688", "40182", "42195", "21995", "4954", "43861", "27495", "57743", "27893", "3655", "3216", "6035", "4935", "57843", "23133","24375","22423","58806","31445","55902","37541","46467"];
    

document.addEventListener('DOMContentLoaded', async () => {

    document.getElementById('todaydate').value = new Date().toISOString().split('T')[0];

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
 
    await initDB();
    await fetchGroups();
    await syncPendingSubmissions();
    
    updateOfflineIndicator();
});

function updateOfflineIndicator() {
    const alert = document.getElementById('offlineAlert');
    alert.style.display = isOnline ? 'none' : 'flex';
}

function handleOnline() {
    isOnline = true;
    updateOfflineIndicator();
    syncPendingSubmissions();
}

function handleOffline() {
    isOnline = false;
    updateOfflineIndicator();
}

async function syncPendingSubmissions() {
    if (!isOnline) return;

    try {
        const pending = await getPendingSubmissions();
        console.log(pending);  // تحقق من محتويات البيانات المخزنة

        for (const submission of pending) {
            try {
                await fetch("https://script.google.com/macros/s/AKfycbwVW-ZlVnMQvYPHaQONLhyGOUhzVHlr4V1NOL39IbKP46lHSZHE0mtrr3OBAxB8Cd3vBQ/exec", {
                    method: "POST",
                    mode: 'no-cors',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(submission.data)
                });
                await deletePendingSubmission(submission.id);
            } catch (error) {
                console.error("Error syncing submission:", error);
            }
        }
    } catch (error) {
        console.error("Error in sync process:", error);
    }
}



async function fetchGroups() {
    try {
        if (isOnline) {
            const response = await fetch("https://script.google.com/macros/s/AKfycbx2oZJcaSD3IGt316_opGvsuGjXmACOMlqMjOMOtQRqvNcD2vB2sNHTMQ6Y1SSu1A78NA/exec");
            const data = await response.json();
            groupData = data;
            await saveGroupsToCache(data);
        } else {
            const cachedData = await getGroupsFromCache();
            if (cachedData) {
                groupData = cachedData;
            }
        }
        
        updateGroupSelect();
    } catch (error) {
        console.error("Error loading data:", error);
        const cachedData = await getGroupsFromCache();
        if (cachedData) {
            groupData = cachedData;
            updateGroupSelect();
        } else {
            alert("Erreur lors de la récupération des données !");
        }
    }
}

function updateGroupSelect() {
    const select = document.getElementById('groupSelect');
    select.innerHTML = '<option value="">Sélectionnez Equipe</option>';
    
    Object.keys(groupData).sort().forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        select.appendChild(option);
    });
    
    select.addEventListener('change', function() {
        selectedGroup = this.value;
        displayMembers();
    });
}

function displayMembers() {
    const table = document.getElementById('memberTable');
    table.innerHTML = '';
    
    if (!selectedGroup) return;
    
    const members = groupData[selectedGroup] || [];
    const sortedMembers = members.sort((a, b) => a.member.localeCompare(b.member));
    
    sortedMembers.forEach(member => {
        const row = document.createElement('tr');
        row.className = selectedMembers.has(member.code) ? 'selected' : '';
        
        row.innerHTML = `
            <td><input type="checkbox" class="select-checkbox" ${selectedMembers.has(member.code) ? 'checked' : ''} data-code="${member.code}"></td>
            <td class="clickable">${member.code}</td>
            <td class="clickable">${member.member}</td>
            <td><input type="number" class="hours-input" value="${memberHours[member.code] || '0'}" min="0" step="0.5"></td>
        `;
        
        const checkbox = row.querySelector('.select-checkbox');
        const hoursInput = row.querySelector('.hours-input');
        
        checkbox.addEventListener('change', () => handleMemberSelect(member.code));
        row.querySelectorAll('.clickable').forEach(cell => {
            cell.addEventListener('click', () => handleMemberSelect(member.code));
        });
        
        hoursInput.addEventListener('change', (e) => {
            memberHours[member.code] = e.target.value;
        });
        
        table.appendChild(row);
    });
    
    updateSelectedCount();
}

function handleMemberSelect(code) {
    if (selectedMembers.has(code)) {
        selectedMembers.delete(code);
        memberHours[code] = '0';
    } else {
        selectedMembers.add(code);
        let hours = document.getElementById('defaultHours').value;
        if (h12.includes(code)) hours = '11';
        else if (h9.includes(code)) hours = '9';
        else if (h10.includes(code)) hours = '10';
        else if (fix.includes(code)) hours = '8';
        memberHours[code] = hours;
    }
    
    displayMembers();
}

function toggleSelectAll() {
    const allMembers = groupData[selectedGroup] || [];
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    if (selectedMembers.size === allMembers.length) {
        selectedMembers.clear();
        memberHours = {};
        selectAllBtn.textContent = 'Sélectionner tout';
    } else {
        allMembers.forEach(member => {
            selectedMembers.add(member.code);
            let hours = document.getElementById('defaultHours').value;
            if (h12.includes(member.code)) hours = '11';
            else if (h9.includes(member.code)) hours = '9';
            else if (h10.includes(member.code)) hours = '10';
            else if (fix.includes(member.code)) hours = '8';
            memberHours[member.code] = hours;
        });
        selectAllBtn.textContent = 'Désélectionner tout';
    }
    
    displayMembers();
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedMembers.size;
}

function showConfirmModal() {
    if (selectedMembers.size === 0) {
        alert("Aucun travailleur sélectionné !");
        return;
    }
    document.getElementById('confirmationModal').style.display = 'flex';
}

function closeConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
}

async function saveData() {
    if (selectedMembers.size === 0) {
        alert("Aucun travailleur sélectionné !");
        return;
    }

    const dataToSend = Array.from(selectedMembers).map(code => {
        const member = groupData[selectedGroup].find(m => m.code === code);
        return {
            code,
            name: member?.member || '',
            group: selectedGroup,  // إضافة اسم المجموعة
            hours: memberHours[code] || '0',  // إضافة عدد الساعات
            todaydate: document.getElementById('todaydate').value,  // إضافة التاريخ
            fin: 'N 10'  // إضافة أي معلومات إضافية قد تكون مطلوبة
        };
    });

    // إضافة معلومات إضافية (مثل اسم المجموعة، التاريخ، أو تفاصيل أخرى)
    const allData = {
        selectedGroup,  // اسم المجموعة
        selectedMembers: Array.from(selectedMembers),  // جميع العمال المختارين
        memberHours,  // جميع الساعات المدخلة
        todaydate: document.getElementById('todaydate').value,  // التاريخ
        dataToSend  // البيانات التي سيتم إرسالها
    };

    try {
        if (isOnline) {
            // إرسال البيانات إلى Google Sheets
            await fetch("https://script.google.com/macros/s/AKfycbwVW-ZlVnMQvYPHaQONLhyGOUhzVHlr4V1NOL39IbKP46lHSZHE0mtrr3OBAxB8Cd3vBQ/exec", {
                method: "POST",
                mode: 'no-cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(allData)  // إرسال جميع البيانات
            });

            alert("Données enregistrées avec succès !");
        } else {
            // إذا لم يكن هناك اتصال بالإنترنت، حفظ البيانات محليًا
            await savePendingSubmission({ data: allData, timestamp: new Date().toISOString() });
            alert("Données enregistrées localement. Elles seront synchronisées lorsque la connexion Internet sera rétablie.");
        }

        // إعادة تعيين الاختيارات بعد الحفظ
        selectedMembers.clear();
        memberHours = {};
        closeConfirmationModal();
        displayMembers();
    } catch (error) {
        if (!isOnline) {
            await savePendingSubmission({ data: allData, timestamp: new Date().toISOString() });
            alert("Données enregistrées localement. Elles seront synchronisées lorsque la connexion Internet sera rétablie.");
            selectedMembers.clear();
            memberHours = {};
            closeConfirmationModal();
            displayMembers();
        } else {
            alert("Erreur lors de l'enregistrement des données !");
        }
    }
}


function handleOnline() {
    isOnline = true;
    updateOfflineIndicator();
    syncPendingSubmissions();  // إرسال البيانات المخزنة بعد عودة الاتصال
}


