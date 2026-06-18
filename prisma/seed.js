const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Your own company — always the SENDER ──
const SENDER = {
  name: 'Shree Constructions Pvt Ltd',
  code: 'SHRC', 
  adminCode: 'SHRC-ADM',
  employeeCode: 'SHRC-EMP',
};

// ── Companies you send memos TO — receivers only ──
const RECEIVERS = [
  { name: 'Ganga Infra Pvt Ltd',       code: 'GNGI', adminCode: 'GNGI-ADM', employeeCode: 'GNGI-EMP' },
  { name: 'Bengal Builders Ltd',       code: 'BNGB', adminCode: 'BNGB-ADM', employeeCode: 'BNGB-EMP' },
  { name: 'Apex Cement Co',            code: 'APXC', adminCode: 'APXC-ADM', employeeCode: 'APXC-EMP' },
  { name: 'Newtown Realty Pvt Ltd',    code: 'NWTR', adminCode: 'NWTR-ADM', employeeCode: 'NWTR-EMP' },
  { name: 'Riverside Developers',      code: 'RSDV', adminCode: 'RSDV-ADM', employeeCode: 'RSDV-EMP' },
  { name: 'Hooghly Logistics Pvt Ltd', code: 'HGLG', adminCode: 'HGLG-ADM', employeeCode: 'HGLG-EMP' },
];

const PURPOSES = [
  { name: 'Material Request',     code: 'MR' },
  { name: 'Payment Approval',     code: 'PA' },
  { name: 'Site Inspection',      code: 'SI' },
  { name: 'Equipment Transfer',   code: 'ET' },
  { name: 'Labour Allocation',    code: 'LA' },
  { name: 'Vendor Communication', code: 'VC' },
];

const TODAY = new Date(); // hard ceiling — nothing is ever seeded past this

function randomDateInYear(year) {
  const start = new Date(year, 0, 1);
  const end = year === TODAY.getFullYear() ? TODAY : new Date(year, 11, 31);
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

async function main() {
  // 1. Sender (your company)
  const sender = await prisma.company.upsert({
    where: { code: SENDER.code },
    update: {},
    create: { ...SENDER, isSystemCompany: false },
  });

  // 2. Receivers
  const receivers = [];
  for (const r of RECEIVERS) {
    receivers.push(
      await prisma.company.upsert({
        where: { code: r.code },
        update: {},
        create: { ...r, isSystemCompany: false },
      })
    );
  }

  // 3. Purposes
  const purposes = [];
  for (const p of PURPOSES) {
    purposes.push(await prisma.purpose.upsert({ where: { code: p.code }, update: {}, create: p }));
  }

  // 4. Entries — 2024, 2025, 2026 (up to today), with gaps in slNo
  const yearTargets = { 2024: 35, 2025: 45, 2026: 25 };
  const sendCountTracker = {}; // `${year}-${receiverId}` -> running count, matches your real sendCount logic

  for (const [yearStr, count] of Object.entries(yearTargets)) {
    const year = Number(yearStr);
    let slNo = 0;

    for (let i = 0; i < count; i++) {
      slNo += Math.floor(Math.random() * 3) + 1; // gap of 1-3, leaves room to insert memos later

      const receiver = receivers[Math.floor(Math.random() * receivers.length)];
      const purpose = purposes[Math.floor(Math.random() * purposes.length)];
      const date = randomDateInYear(year);

      const countKey = `${year}-${receiver.id}`;
      sendCountTracker[countKey] = (sendCountTracker[countKey] || 0) + 1;
      const sendCount = sendCountTracker[countKey];

      const memoNumber = `${String(slNo).padStart(3, '0')}/${sender.code}/${receiver.code}/${purpose.code}/${String(sendCount).padStart(2, '0')}`;

      await prisma.entry.create({
        data: {
          year,
          slNo,
          memoNumber,
          senderCompanyId: sender.id,
          receiverCompanyId: receiver.id,
          purposeId: purpose.id,
          sendCount,
          description: `${purpose.name} - ${receiver.name}`,
          date,
          isLegacy: false,
        },
      });
    }
  }

  console.log('Seed complete:', {
    sender: sender.name,
    receivers: receivers.length,
    purposes: purposes.length,
    years: Object.keys(yearTargets),
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());