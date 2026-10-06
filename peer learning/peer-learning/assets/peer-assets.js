/*
 * peer-assets.js — Bộ hình vẽ SVG cho trang Peer Learning
 * ---------------------------------------------------------------
 * Không cần thư viện, không cần build. Nhúng bằng:
 *   <script src="assets/peer-assets.js"></script>
 * rồi dùng qua biến toàn cục `PeerAssets`.
 *
 *   PeerAssets.renderCharacter({ gender, hair, expression, hairColor, skin, accessory, eyes, brows, mark })
 *     (eyes, brows, mark không bắt buộc — thiếu thì dùng mặc định)
 *   PeerAssets.renderDesk(deskId)
 *   PeerAssets.renderSeat({ character, deskId, empty })   // nhân vật ngồi sau bàn
 *   PeerAssets.renderBookshelf(subjects)                  // mỗi cuốn sách là một link
 *
 * Mọi hàm trả về chuỗi SVG, gán thẳng vào innerHTML.
 * Muốn thêm kiểu tóc / biểu cảm / bàn / phụ kiện mới: thêm một mục vào
 * HAIR, FACES, DESKS hoặc ACCESSORIES theo đúng khuôn của các mục có sẵn.
 */
(function (root) {
  'use strict';

  const INK = '#3b2f33';
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const LINE = `fill="none" ${S}`;

  /* ============================================================
   * 1. NHÂN VẬT — phong cách chibi, khung vẽ 200 x 320
   *    Thứ tự lớp: tóc sau → tay → chân → áo → cổ → tai → đầu → má, chi tiết → mắt → miệng
   *                → tóc trước → lông mày → phụ kiện → hiệu ứng của biểu cảm (zzz, nước mắt, lấp lánh…)
   *    Nhân vật dùng nét viền nâu mềm (VIEN); bàn ghế, tủ sách vẫn dùng nét mực INK.
   *    Muốn thêm lựa chọn: thêm một mục vào SKIN_TONES, HAIR_COLORS, HAIR, EYES, BROWS, MARKS,
   *    FACES (biểu cảm) hoặc ACCESSORIES theo đúng khuôn các mục có sẵn.
   * ============================================================ */
  const VIEN = '#5b4339';
  const SV = `stroke="${VIEN}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  const LV = `fill="none" ${SV}`;
  const RED = '#e2504c';
  const SHIRT = '#ffffff';
  const SHIRT_SHADE = '#e2e9f4';
  const NAVY = '#2f4170';
  const MIENG = '#c4474f';
  const LUOI = '#ff8f94';

  // Pha màu: sáng / tối hơn để làm bóng tóc
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const tron = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const mauToc = (hex) => ({ base: hex, sang: tron(hex, '#ffffff', 0.38), toi: tron(hex, '#000000', 0.28) });

  const star = (x, y, r, fill) =>
    `<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  const lapLanh = (x, y, r, fill = '#ffd766') =>
    `<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z" fill="${fill}" stroke="${VIEN}" stroke-width="1.6" stroke-linejoin="round"/>`;

  const SKIN_TONES = {
    sang: { name: 'Sáng', base: '#ffe4d1', shade: '#f5c7ab' },
    tunhien: { name: 'Tự nhiên', base: '#f7d0aa', shade: '#e6b087' },
    ngam: { name: 'Ngăm', base: '#e0a979', shade: '#c88c5e' },
    nau: { name: 'Nâu', base: '#b7825a', shade: '#9a6a45' }
  };

  const HAIR_COLORS = {
    den: { name: 'Đen', hex: '#2f2629' },
    nauden: { name: 'Nâu đen', hex: '#4b342b' },
    nau: { name: 'Nâu', hex: '#7b4d32' },
    hatde: { name: 'Hạt dẻ', hex: '#a8653c' },
    xanh: { name: 'Xanh than', hex: '#3f5f9e', unlockPrice: 120 },
    hong: { name: 'Hồng đào', hex: '#e58aa8', unlockPrice: 120 },
    tim: { name: 'Tím khoai môn', hex: '#8a6cc0', unlockPrice: 150 },
    vang: { name: 'Vàng kem', hex: '#dfb25a', unlockPrice: 150 }
  };

  /* ---------- Tóc: back(c) vẽ sau thân, front(c) vẽ trên mặt; c = { base, sang, toi } ---------- */
  const bong = (c, d) => `<path d="${d}" fill="${c.sang}" opacity=".6"/>`;
  const soi = (c, d, o = 0.45) => `<path d="${d}" fill="none" stroke="${c.toi}" stroke-width="2" stroke-linecap="round" opacity="${o}"/>`;
  const veToc = (c, d) => `<path d="${d}" fill="${c.base}" ${SV}/>`;
  // Mái chẻ đôi dùng chung cho nhiều kiểu tóc nữ
  const MAI_CHE = 'M36,122 C30,64 60,36 100,36 C140,36 170,64 164,122 C160,106 154,96 146,90 C132,96 114,92 102,76 C92,92 74,98 58,92 C48,98 40,110 36,122 Z';
  const BONG_MAI = 'M58,58 C72,46 90,42 104,44 C90,50 76,56 66,66 Z';

  const HAIR = {
    male: {
      'nam-ngan': {
        name: 'Ngắn gọn',
        back: () => '',
        front: (c) =>
          veToc(c, 'M36,120 C30,70 58,36 100,36 C142,36 170,70 164,120 C160,106 156,98 150,92 C142,98 128,98 118,88 C110,98 92,100 80,92 C70,100 54,100 48,96 C42,104 38,112 36,120 Z') +
          bong(c, 'M60,56 C74,44 92,42 106,44 C92,48 78,54 68,64 Z') +
          soi(c, 'M118,88 C122,76 126,66 134,58 M80,92 C82,80 86,70 92,62')
      },
      'nam-re-ngoi': {
        name: 'Rẽ ngôi',
        back: () => '',
        front: (c) =>
          veToc(c, 'M36,122 C28,66 60,34 104,34 C146,34 172,66 164,122 C162,108 158,98 152,90 C134,96 108,86 86,68 C80,84 60,98 44,102 C40,108 37,114 36,122 Z') +
          bong(c, 'M112,44 C128,40 144,46 152,58 C142,54 128,52 116,52 Z') +
          soi(c, 'M86,68 C96,54 110,46 126,42', 0.6) + soi(c, 'M120,90 C114,80 104,74 96,70')
      },
      'nam-xoan': {
        name: 'Xoăn',
        back: () => '',
        front: (c) => {
          const lon = [[42, 104, 14], [46, 82, 16], [58, 62, 17], [78, 48, 18], [100, 42, 19], [122, 46, 18], [142, 58, 17], [155, 78, 16], [159, 100, 14]];
          const mai = [[64, 88, 13], [86, 84, 13], [110, 84, 13], [132, 88, 12]];
          const tat = [...lon, ...mai];
          return (
            tat.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.base}" ${SV}/>`).join('') +
            `<path d="M40,108 C36,60 64,42 100,42 C136,42 164,60 160,108 C150,92 130,86 100,86 C70,86 50,92 40,108 Z" fill="${c.base}"/>` +
            tat.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.6}" fill="${c.base}"/>`).join('') +
            tat.slice(2, 7).map(([x, y, r]) => `<path d="M${x - r * 0.5},${y - r * 0.2} q${r * 0.4},-${r * 0.5} ${r * 0.8},0" fill="none" stroke="${c.sang}" stroke-width="2.4" stroke-linecap="round"/>`).join('')
          );
        }
      },
      'nam-mai-bang': {
        name: 'Mái bằng',
        back: () => '',
        front: (c) =>
          veToc(c, 'M34,124 C28,62 60,32 100,32 C140,32 172,62 166,124 L160,124 C159,112 157,104 154,97 C140,93 120,92 100,92 C80,92 60,93 46,97 C43,104 41,112 40,124 Z') +
          bong(c, 'M56,56 C72,42 96,38 116,40 C96,46 76,52 64,64 Z') +
          soi(c, 'M62,93 l2,-10 M80,92 l1,-12 M100,92 v-12 M120,92 l-1,-12 M138,93 l-2,-10')
      },
      'nam-vuot-nguoc': {
        name: 'Vuốt ngược',
        back: () => '',
        front: (c) =>
          veToc(c, 'M40,114 C38,84 46,62 66,50 C70,32 96,22 122,26 C146,30 160,48 156,62 C162,76 162,96 160,114 C156,100 150,90 142,86 C124,80 88,80 66,86 C54,92 44,102 40,114 Z') +
          bong(c, 'M76,40 C92,30 114,28 132,34 C114,36 96,40 84,48 Z') +
          soi(c, 'M78,52 C96,40 118,38 138,46 M80,66 C98,56 122,56 142,64')
      },
      'nam-mai-giua': {
        name: 'Rẽ giữa',
        back: (c) => veToc(c, 'M38,112 C34,136 38,150 48,154 L50,112 Z') + veToc(c, 'M162,112 C166,136 162,150 152,154 L150,112 Z'),
        front: (c) =>
          veToc(c, 'M36,128 C28,64 60,34 100,34 C140,34 172,64 164,128 C160,112 154,100 144,92 C128,86 112,76 100,60 C88,76 72,86 56,92 C46,100 40,112 36,128 Z') +
          bong(c, 'M60,58 C70,46 84,40 96,40 C86,48 76,56 68,68 Z') + bong(c, 'M140,58 C130,46 116,40 104,40 C114,48 124,56 132,68 Z') +
          soi(c, 'M100,60 C98,50 96,44 92,38', 0.6)
      }
    },
    female: {
      'nu-dai-thang': {
        name: 'Dài thẳng',
        back: (c) => veToc(c, 'M32,112 C28,48 60,30 100,30 C140,30 172,48 168,112 L174,238 C160,250 146,244 138,236 L136,150 L64,150 L62,236 C54,244 40,250 26,238 Z') +
          soi(c, 'M40,160 L36,226 M160,160 L164,226', 0.35),
        front: (c) =>
          veToc(c, MAI_CHE) + bong(c, BONG_MAI) +
          veToc(c, 'M38,112 C34,140 38,170 46,196 C50,180 52,150 50,118 Z') + veToc(c, 'M162,112 C166,140 162,170 154,196 C150,180 148,150 150,118 Z')
      },
      'nu-duoi-ngua': {
        name: 'Đuôi ngựa',
        back: (c) => veToc(c, 'M134,48 C176,40 198,84 192,134 C188,170 172,196 150,210 C162,180 168,146 160,116 C154,92 146,70 134,48 Z') +
          bong(c, 'M160,62 C178,74 186,98 184,124 C178,104 170,84 160,72 Z'),
        front: (c) =>
          veToc(c, 'M36,120 C30,64 60,36 100,36 C140,36 170,62 164,120 C160,104 154,94 146,88 C120,94 92,84 72,66 C64,84 52,96 42,102 C39,108 37,114 36,120 Z') +
          bong(c, 'M96,42 C116,40 136,46 148,58 C134,54 116,52 102,52 Z') +
          veToc(c, 'M40,106 C36,128 40,146 48,158 L52,112 Z') +
          `<circle cx="146" cy="50" r="8" fill="${RED}" ${SV}/>`
      },
      'nu-bob': {
        name: 'Tóc bob',
        back: (c) => veToc(c, 'M30,120 C26,46 60,30 100,30 C140,30 174,46 170,120 C174,148 166,164 148,162 L146,128 L54,128 L52,162 C34,164 26,148 30,120 Z'),
        front: (c) =>
          veToc(c, 'M36,120 C30,62 60,36 100,36 C140,36 170,62 164,120 C160,106 156,98 152,94 C130,92 116,88 106,80 C96,90 70,94 48,94 C42,102 38,110 36,120 Z') +
          bong(c, 'M58,56 C74,44 94,40 112,42 C94,48 76,54 66,66 Z') +
          soi(c, 'M106,80 C110,70 116,62 124,56')
      },
      'nu-hai-bim': {
        name: 'Hai bím',
        back: (c) =>
          veToc(c, 'M48,82 C16,90 6,140 18,190 C24,212 40,222 50,214 C40,184 40,146 54,108 Z') +
          veToc(c, 'M152,82 C184,90 194,140 182,190 C176,212 160,222 150,214 C160,184 160,146 146,108 Z') +
          soi(c, 'M30,120 q10,6 4,16 M26,152 q10,6 4,16 M170,120 q-10,6 -4,16 M174,152 q-10,6 -4,16', 0.4),
        front: (c) =>
          veToc(c, MAI_CHE) + bong(c, BONG_MAI) +
          `<circle cx="48" cy="86" r="7" fill="#ffd766" ${SV}/><circle cx="152" cy="86" r="7" fill="#ffd766" ${SV}/>`
      },
      'nu-bui-cao': {
        name: 'Búi cao',
        back: (c) => `<circle cx="100" cy="32" r="22" fill="${c.base}" ${SV}/>` + soi(c, 'M86,26 q14,-12 28,0 M88,38 q12,8 24,0', 0.5) +
          bong(c, 'M88,18 q10,-6 20,0 q-10,0 -16,6 Z'),
        front: (c) =>
          veToc(c, 'M36,120 C30,62 60,40 100,40 C140,40 170,62 164,120 C160,104 154,94 146,88 C130,94 112,90 104,78 C92,92 70,96 56,90 C46,98 40,108 36,120 Z') +
          bong(c, 'M62,58 C76,48 92,46 106,48 C92,52 80,58 70,68 Z') +
          `<path d="M42,108 C38,124 40,138 46,148 M158,108 C162,124 160,138 154,148" fill="none" stroke="${c.base}" stroke-width="4" stroke-linecap="round"/>`
      },
      'nu-xoan-dai': {
        name: 'Xoăn dài',
        back: (c) => veToc(c, 'M30,112 C24,46 60,28 100,28 C140,28 176,46 170,112 C180,140 164,158 176,184 C188,212 168,240 148,232 C156,208 140,192 142,164 L142,150 L58,150 L58,164 C60,192 44,208 52,232 C32,240 12,212 24,184 C36,158 20,140 30,112 Z') +
          soi(c, 'M34,170 q10,10 0,22 M166,170 q-10,10 0,22', 0.4),
        front: (c) =>
          veToc(c, 'M36,122 C28,62 62,34 104,34 C146,34 172,64 164,122 C160,106 154,96 146,90 C126,92 100,84 82,70 C74,86 58,98 44,102 C40,108 38,114 36,122 Z') +
          bong(c, 'M108,42 C126,40 142,46 152,58 C138,54 124,52 112,52 Z') +
          veToc(c, 'M38,110 C30,130 42,146 34,166 C44,160 52,140 50,116 Z') + veToc(c, 'M162,110 C170,130 158,146 166,166 C156,160 148,140 150,116 Z')
      },
      'nu-mai-ngang': {
        name: 'Mái ngang',
        back: (c) => veToc(c, 'M32,112 C28,48 60,30 100,30 C140,30 172,48 168,112 L172,232 L138,232 L136,150 L64,150 L62,232 L28,232 Z'),
        front: (c) =>
          veToc(c, 'M36,118 C30,62 60,36 100,36 C140,36 170,62 164,118 L160,97 L40,97 Z') +
          veToc(c, 'M36,100 L54,100 L54,154 L38,154 C34,140 34,118 36,100 Z') + veToc(c, 'M164,100 L146,100 L146,154 L162,154 C166,140 166,118 164,100 Z') +
          bong(c, 'M58,54 C74,44 94,40 112,42 C94,48 76,54 66,64 Z') +
          soi(c, 'M64,97 v-12 M84,97 v-14 M104,97 v-14 M124,97 v-14 M142,97 v-12')
      }
    }
  };

  /* ---------- Mắt: kiểu mắt (người dùng chọn) × trạng thái (do biểu cảm quyết định) ---------- */
  const MAT_Y = 122;
  const IRIS = '#3a2925';
  const IRIS2 = '#7d5644';
  const EYES = {
    tron: { name: 'Tròn' },
    'long-lanh': { name: 'Long lanh' },
    'mot-mi': { name: 'Một mí' },
    meo: { name: 'Mắt mèo' },
    hien: { name: 'Hiền' },
    cuoi: { name: 'Mắt cười' }
  };
  /** Mắt mở bình thường theo kiểu. `ben`: -1 mắt trái, 1 mắt phải (phía ngoài). `sao`: thay ánh sáng bằng ngôi sao. */
  function matMo(kieu, cx, ben, sao) {
    const y = MAT_Y;
    const anh = (r1, r2) => sao
      ? lapLanh(cx - 1, y - 2, 6, '#ffffff') + `<circle cx="${cx + 3}" cy="${y + 5}" r="${r2}" fill="#fff"/>`
      : `<circle cx="${cx - 3}" cy="${y - 4}" r="${r1}" fill="#fff"/><circle cx="${cx + 3}" cy="${y + 5}" r="${r2}" fill="#fff"/>`;
    switch (kieu) {
      case 'long-lanh':
        return `<ellipse cx="${cx}" cy="${y}" rx="10.5" ry="13" fill="${IRIS}"/>` +
          `<ellipse cx="${cx}" cy="${y + 5}" rx="7.5" ry="6.5" fill="${IRIS2}"/>` + anh(4.4, 2.2) +
          `<path d="M${cx - 11},${y - 6} Q${cx},${y - 17} ${cx + 11},${y - 6}" fill="none" stroke="${VIEN}" stroke-width="3" stroke-linecap="round"/>` +
          `<path d="M${cx + 10 * ben},${y - 8} l${5 * ben},-4" fill="none" stroke="${VIEN}" stroke-width="2.4" stroke-linecap="round"/>`;
      case 'mot-mi':
        return `<path d="M${cx - 11},${y - 1} Q${cx},${y - 7} ${cx + 11},${y - 1} Q${cx + 9},${y + 8} ${cx},${y + 8} Q${cx - 9},${y + 8} ${cx - 11},${y - 1} Z" fill="${IRIS}"/>` +
          `<circle cx="${cx - 2}" cy="${y + 1}" r="2.6" fill="#fff"/>` +
          `<path d="M${cx - 12},${y - 2} Q${cx},${y - 8} ${cx + 12},${y - 2}" fill="none" stroke="${VIEN}" stroke-width="2.6" stroke-linecap="round"/>`;
      case 'meo':
        return `<ellipse cx="${cx}" cy="${y}" rx="9.5" ry="10.5" fill="${IRIS}" transform="rotate(${-14 * ben} ${cx} ${y})"/>` +
          `<ellipse cx="${cx}" cy="${y + 4}" rx="6" ry="5" fill="${IRIS2}"/>` + anh(3.4, 1.6) +
          `<path d="M${cx - 10 * ben},${y - 4} Q${cx},${y - 14} ${cx + 11 * ben},${y - 9} l${6 * ben},-4" fill="none" stroke="${VIEN}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      case 'hien':
        return `<ellipse cx="${cx}" cy="${y + 1}" rx="8.5" ry="10" fill="${IRIS}"/>` +
          `<ellipse cx="${cx}" cy="${y + 5}" rx="5.5" ry="4.5" fill="${IRIS2}"/>` + anh(3.2, 1.5) +
          `<path d="M${cx - 10 * ben},${y - 9} Q${cx},${y - 12} ${cx + 12 * ben},${y - 3}" fill="none" stroke="${VIEN}" stroke-width="2.8" stroke-linecap="round"/>`;
      default: // tròn
        return `<ellipse cx="${cx}" cy="${y}" rx="9" ry="11" fill="${IRIS}"/>` +
          `<ellipse cx="${cx}" cy="${y + 4}" rx="6" ry="5.5" fill="${IRIS2}"/>` + anh(3.4, 1.6);
    }
  }
  function veMat(kieu, trangThai, skin) {
    return [[78, -1], [122, 1]].map(([cx, ben]) => {
      const y = MAT_Y;
      if (trangThai === 'nham') {
        return `<path d="M${cx - 9},${y} Q${cx},${y + 7} ${cx + 9},${y}" fill="none" stroke="${VIEN}" stroke-width="3" stroke-linecap="round"/>` +
          `<path d="M${cx + 9 * ben},${y} l${3 * ben},-2" fill="none" stroke="${VIEN}" stroke-width="2" stroke-linecap="round"/>`;
      }
      if (trangThai === 'cuoi' || (kieu === 'cuoi' && trangThai === 'mo')) {
        return `<path d="M${cx - 9},${y + 3} Q${cx},${y - 8} ${cx + 9},${y + 3}" fill="none" stroke="${VIEN}" stroke-width="3.4" stroke-linecap="round"/>`;
      }
      const k = kieu === 'cuoi' ? 'tron' : kieu;
      let m = matMo(k, cx, ben, trangThai === 'sao');
      if (trangThai === 'to') m = `<g transform="translate(${cx} ${y}) scale(1.18) translate(${-cx} ${-y})">${m}</g>`;
      if (trangThai === 'nheo') {
        // Mí trên hạ xuống một nửa: tập trung / tự tin
        m += `<path d="M${cx - 13},${y - 16} L${cx + 13},${y - 16} L${cx + 13},${y - 2} Q${cx},${y + 1} ${cx - 13},${y - 2} Z" fill="${skin.base}"/>` +
          `<path d="M${cx - 11},${y - 2} Q${cx},${y + 1} ${cx + 11},${y - 2}" fill="none" stroke="${VIEN}" stroke-width="3" stroke-linecap="round"/>`;
      }
      return m;
    }).join('');
  }

  /* ---------- Lông mày: kiểu × cách biểu cảm uốn ---------- */
  const MAY_Y = 103;
  const BROWS = {
    cong: { name: 'Cong', cao: -4, day: 3.2 },
    thang: { name: 'Thẳng', cao: -1, day: 3.4 },
    ram: { name: 'Rậm', cao: -3, day: 5.6 },
    manh: { name: 'Mảnh', cao: -4, day: 2 }
  };
  // trong: đầu mày phía trong (âm = nhướng lên); ngoai: đuôi mày; dy: cả cặp
  const UON_MAY = {
    binh: { trong: 0, ngoai: 0, dy: 0 },
    lo: { trong: -6, ngoai: 2, dy: 0 },
    nhiu: { trong: 4, ngoai: -2, dy: 1 },
    nhuong: { trong: 0, ngoai: 0, dy: -6 },
    thugian: { trong: 1, ngoai: 2, dy: 2 },
    lech: { trong: 0, ngoai: 0, dy: 0, phai: -5 }
  };
  function veMay(kieu, uon, c) {
    const B = BROWS[kieu] || BROWS.cong;
    const U = UON_MAY[uon] || UON_MAY.binh;
    return [[78, -1], [122, 1]].map(([cx, ben]) => {
      const y = MAY_Y + U.dy + (ben === 1 && U.phai ? U.phai : 0);
      const ix = cx - 10 * ben, ox = cx + 11 * ben;
      const iy = y + U.trong, oy = y + U.ngoai;
      return `<path d="M${ox},${oy} Q${cx},${(iy + oy) / 2 + B.cao} ${ix},${iy}" fill="none" stroke="${c.toi}" stroke-width="${B.day}" stroke-linecap="round"/>`;
    }).join('');
  }

  /* ---------- Chi tiết trên mặt (miễn phí) ---------- */
  const MARKS = {
    khong: { name: 'Không', draw: () => '' },
    'ma-hong': {
      name: 'Má hồng đậm',
      draw: () => [64, 136].map((x) => `<ellipse cx="${x}" cy="137" rx="11" ry="6" fill="#ff8f9a" opacity=".55"/>` +
        `<path d="M${x - 6},138 l3,-5 M${x - 1},139 l3,-5 M${x + 4},139 l3,-5" fill="none" stroke="#ec6f80" stroke-width="1.6" stroke-linecap="round"/>`).join('')
    },
    'tan-nhang': {
      name: 'Tàn nhang',
      draw: (skin) => [[60, 131], [66, 128], [71, 133], [64, 135], [140, 131], [134, 128], [129, 133], [136, 135]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${tron(skin.shade, '#5b4339', 0.35)}"/>`).join('')
    },
    'not-ruoi': { name: 'Nốt ruồi duyên', draw: () => `<circle cx="118" cy="149" r="1.9" fill="#4a332b"/>` },
    urgo: {
      name: 'Miếng dán urgo',
      draw: () => `<g transform="rotate(-20 138 134)"><rect x="126" y="129" width="24" height="10" rx="5" fill="#f3d2a6" stroke="${VIEN}" stroke-width="1.6"/>` +
        `<rect x="134" y="129" width="8" height="10" fill="#e8bd8a"/><circle cx="130" cy="134" r=".9" fill="${VIEN}"/><circle cx="146" cy="134" r=".9" fill="${VIEN}"/></g>`
    },
    sao: { name: 'Ngôi sao trên má', draw: () => lapLanh(140, 135, 7.5, '#ffd766') }
  };

  /* ---------- Biểu cảm: mắt, mày, miệng và hiệu ứng (dùng làm trạng thái trong phòng học) ---------- */
  const mieng = {
    cuoi: () => `<path d="M89,139 Q100,154 111,139 Z" fill="${MIENG}" ${SV}/><path d="M94,146 Q100,150 106,146 Q100,143 94,146 Z" fill="${LUOI}"/>`,
    haMo: () => `<path d="M85,136 Q100,162 115,136 Z" fill="${MIENG}" ${SV}/><path d="M92,149 Q100,156 108,149 Q100,145 92,149 Z" fill="${LUOI}"/>`,
    ngap: () => `<ellipse cx="100" cy="145" rx="4.5" ry="5.5" fill="${MIENG}" ${SV}/>`,
    meu: () => `<path d="M90,148 Q100,139 110,148" ${LV}/>`,
    nhech: () => `<path d="M91,145 Q103,149 112,139" ${LV}/>`,
    tronO: () => `<ellipse cx="100" cy="146" rx="6.5" ry="8.5" fill="${MIENG}" ${SV}/>`,
    mim: () => `<path d="M92,144 Q100,142 108,144" ${LV}/>`
  };
  const FACES = {
    'vui-ve': { name: 'Vui vẻ', mat: 'mo', may: 'binh', draw: () => mieng.cuoi(), them: () => '' },
    'hao-huc': {
      name: 'Háo hức', mat: 'sao', may: 'nhuong', draw: () => mieng.haMo(),
      them: () => lapLanh(30, 64, 9) + lapLanh(170, 58, 7) + lapLanh(160, 30, 5)
    },
    'buon-ngu': {
      name: 'Buồn ngủ', mat: 'nham', may: 'thugian', draw: () => mieng.ngap(),
      them: () => `<text x="150" y="70" font-family="inherit" font-weight="800" font-size="20" fill="#7c8fd6" stroke="${VIEN}" stroke-width=".6">z</text>` +
        `<text x="164" y="52" font-family="inherit" font-weight="800" font-size="15" fill="#7c8fd6" stroke="${VIEN}" stroke-width=".5">z</text>`
    },
    'buon-ba': {
      name: 'Buồn bã', mat: 'mo', may: 'lo', draw: () => mieng.meu(),
      them: () => `<path d="M70,132 Q65,142 70,146 Q75,142 70,132 Z" fill="#9ad8ff" stroke="${VIEN}" stroke-width="1.6"/>`
    },
    'tu-tin': {
      name: 'Tự tin', mat: 'nheo', may: 'lech', draw: () => mieng.nhech(),
      them: () => lapLanh(164, 70, 8) + lapLanh(176, 54, 4.5)
    },
    'ngac-nhien': {
      name: 'Ngạc nhiên', mat: 'to', may: 'nhuong', draw: () => mieng.tronO(),
      them: () => `<path d="M156,46 l4,-12 M166,54 l10,-6 M170,66 l10,0" fill="none" stroke="${VIEN}" stroke-width="2.6" stroke-linecap="round"/>`
    },
    'tap-trung': {
      name: 'Tập trung', mat: 'nheo', may: 'nhiu', draw: () => mieng.mim(),
      them: () => `<path d="M154,84 Q147,95 154,100 Q161,95 154,84 Z" fill="#a9e2ff" stroke="${VIEN}" stroke-width="1.6"/>`
    }
  };

  /* ---------- Phụ kiện (mua bằng điểm chăm chỉ) ---------- */
  const hoa = (x, y, mau) =>
    [0, 72, 144, 216, 288].map((g) => {
      const r = (g * Math.PI) / 180;
      return `<circle cx="${(x + Math.cos(r) * 4.5).toFixed(1)}" cy="${(y + Math.sin(r) * 4.5).toFixed(1)}" r="4" fill="${mau}" stroke="${VIEN}" stroke-width="1.2"/>`;
    }).join('') + `<circle cx="${x}" cy="${y}" r="2.6" fill="#ffd766"/>`;
  const ACCESSORIES = {
    'khong': { name: 'Không đeo', price: 0, draw: () => '' },
    'kinh-tron': {
      name: 'Kính tròn', price: 60,
      draw: () =>
        `<circle cx="78" cy="122" r="14" fill="#ffffff" fill-opacity=".22" ${SV}/><circle cx="122" cy="122" r="14" fill="#ffffff" fill-opacity=".22" ${SV}/>` +
        `<path d="M92,120 Q100,115 108,120 M64,119 L44,115 M136,119 L156,115" ${LV}/>` +
        `<path d="M70,114 l6,-3 M114,114 l6,-3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`
    },
    'kinh-vuong': {
      name: 'Kính vuông', price: 70,
      draw: () =>
        `<rect x="62" y="110" width="31" height="24" rx="7" fill="#ffffff" fill-opacity=".2" stroke="#2f2f3a" stroke-width="3.2"/>` +
        `<rect x="107" y="110" width="31" height="24" rx="7" fill="#ffffff" fill-opacity=".2" stroke="#2f2f3a" stroke-width="3.2"/>` +
        `<path d="M93,119 Q100,115 107,119 M62,118 L44,114 M138,118 L156,114" fill="none" stroke="#2f2f3a" stroke-width="3" stroke-linecap="round"/>`
    },
    'kep-toc-sao': {
      name: 'Kẹp tóc ngôi sao', price: 50,
      draw: () => `<rect x="46" y="80" width="26" height="6" rx="3" fill="#ff8fb1" stroke="${VIEN}" stroke-width="1.8" transform="rotate(-24 59 83)"/>` + lapLanh(70, 74, 9)
    },
    'no-buoc-toc': {
      name: 'Nơ buộc tóc', price: 80,
      draw: () =>
        `<path d="M142,50 L120,38 Q116,50 122,62 Z M142,50 L164,38 Q168,50 162,62 Z" fill="${RED}" ${SV}/>` +
        `<circle cx="142" cy="50" r="6.5" fill="#ff8a8a" ${SV}/>`
    },
    'tai-nghe': {
      name: 'Tai nghe', price: 100,
      draw: () =>
        `<path d="M40,108 Q38,24 100,24 Q162,24 160,108" fill="none" stroke="${VIEN}" stroke-width="11" stroke-linecap="round"/>` +
        `<path d="M40,108 Q38,24 100,24 Q162,24 160,108" fill="none" stroke="#ef6f5e" stroke-width="5.5" stroke-linecap="round"/>` +
        `<rect x="27" y="98" width="21" height="36" rx="10" fill="#ef6f5e" ${SV}/><rect x="152" y="98" width="21" height="36" rx="10" fill="#ef6f5e" ${SV}/>`
    },
    'mu-len': {
      name: 'Mũ len', price: 120,
      draw: () =>
        `<path d="M36,90 Q34,24 100,24 Q166,24 164,90 Z" fill="#ef6f5e" ${SV}/>` +
        `<path d="M64,40 v40 M82,32 v48 M100,28 v52 M118,32 v48 M136,40 v40" stroke="#d6574a" stroke-width="2" stroke-linecap="round"/>` +
        `<rect x="32" y="80" width="136" height="20" rx="9" fill="#d95a4a" ${SV}/>` +
        `<circle cx="100" cy="22" r="12" fill="#ffffff" ${SV}/>`
    },
    'mu-luoi-trai': {
      name: 'Mũ lưỡi trai', price: 140,
      draw: () =>
        `<path d="M40,86 Q36,28 100,28 Q164,28 160,86 Z" fill="#4f8fd8" ${SV}/>` +
        `<path d="M40,86 Q104,68 180,88 Q186,98 172,98 L40,94 Z" fill="#3d7fc4" ${SV}/>` +
        `<circle cx="100" cy="30" r="5" fill="#ffd766" ${SV}/>`
    },
    'tai-meo': {
      name: 'Băng đô tai mèo', price: 150,
      draw: () =>
        `<path d="M50,58 L46,22 L80,42 Z M150,58 L154,22 L120,42 Z" fill="#3a2f35" ${SV}/>` +
        `<path d="M55,50 L53,32 L70,43 Z M145,50 L147,32 L130,43 Z" fill="#ff9ab0"/>` +
        `<path d="M42,96 Q40,38 100,38 Q160,38 158,96" fill="none" stroke="#3a2f35" stroke-width="7" stroke-linecap="round"/>`
    },
    'vong-hoa': {
      name: 'Vòng hoa', price: 180,
      draw: () => {
        const dd = [[44, 82, '#ff9ab0'], [56, 62, '#ffffff'], [74, 48, '#ffd766'], [94, 42, '#ff9ab0'], [114, 42, '#ffffff'], [134, 48, '#ffd766'], [150, 62, '#ff9ab0'], [158, 82, '#ffffff']];
        return `<path d="M42,92 Q40,40 100,38 Q160,40 158,92" fill="none" stroke="#5fae6a" stroke-width="3.5" stroke-linecap="round"/>` +
          [[64, 56], [104, 38], [142, 54]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="3" fill="#6bbf59" stroke="${VIEN}" stroke-width="1.2" transform="rotate(-20 ${x} ${y})"/>`).join('') +
          dd.map(([x, y, m]) => hoa(x, y, m)).join('');
      }
    }
  };

  /* ---------- Thân: đồng phục học sinh ---------- */
  function bodyMarkup(gender, skin) {
    const tay =
      `<path d="M70,168 Q54,172 50,192 L48,204 L66,206 L70,186 Z" fill="${SHIRT}" ${SV}/>` +
      `<path d="M48,204 L66,206 L64,222 Q56,232 48,222 Z" fill="${skin.base}" ${SV}/>`;
    const haiTay = tay + `<g transform="translate(200,0) scale(-1,1)">${tay}</g>`;
    const than =
      `<path d="M66,186 Q66,162 88,160 L112,160 Q134,162 134,186 L130,232 Q100,238 70,232 Z" fill="${SHIRT}" ${SV}/>` +
      `<path d="M120,165 Q131,172 131,188 L128,230 Q122,232 116,232 Q123,200 120,165 Z" fill="${SHIRT_SHADE}"/>`;
    const co = `<path d="M86,160 L100,174 L90,182 L80,164 Z M114,160 L100,174 L110,182 L120,164 Z" fill="${SHIRT}" ${SV}/>`;
    const giay = (x) => `<rect x="${x}" y="284" width="32" height="17" rx="8" fill="${VIEN}"/><rect x="${x + 4}" y="286" width="10" height="4" rx="2" fill="#fff" opacity=".35"/>`;

    if (gender === 'female') {
      const chan = (x) =>
        `<rect x="${x}" y="256" width="17" height="32" fill="${skin.base}" ${SV}/>` +
        `<rect x="${x}" y="272" width="17" height="16" fill="#ffffff" ${SV}/>`;
      return (
        haiTay + chan(79) + chan(104) + giay(70) + giay(98) + than +
        `<path d="M68,224 L132,224 L144,260 Q100,270 56,260 Z" fill="${NAVY}" ${SV}/>` +
        `<path d="M84,228 L78,262 M100,228 L100,265 M116,228 L122,262" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".25"/>` +
        `<rect x="66" y="220" width="68" height="9" rx="4" fill="${NAVY}" ${SV}/>` +
        co +
        `<path d="M100,176 L85,167 L87,186 Z M100,176 L115,167 L113,186 Z" fill="${RED}" ${SV}/>` +
        `<circle cx="100" cy="176" r="4.5" fill="${RED}" ${SV}/>`
      );
    }
    return (
      haiTay +
      `<rect x="72" y="228" width="26" height="60" rx="8" fill="${NAVY}" ${SV}/>` +
      `<rect x="102" y="228" width="26" height="60" rx="8" fill="${NAVY}" ${SV}/>` +
      giay(66) + giay(102) + than +
      `<rect x="68" y="226" width="64" height="8" rx="3" fill="${VIEN}"/>` +
      co +
      `<path d="M95,168 L105,168 L108,200 L100,210 L92,200 Z" fill="${NAVY}" ${SV}/>`
    );
  }

  function characterInner(opts) {
    const o = normalizeCharacter(opts);
    const skin = SKIN_TONES[o.skin];
    const c = mauToc(HAIR_COLORS[o.hairColor].hex);
    const hair = HAIR[o.gender][o.hair];
    const f = FACES[o.expression];
    return (
      hair.back(c) +
      bodyMarkup(o.gender, skin) +
      `<rect x="91" y="148" width="18" height="18" fill="${skin.shade}" ${SV}/>` +
      `<circle cx="41" cy="116" r="9" fill="${skin.base}" ${SV}/><circle cx="159" cy="116" r="9" fill="${skin.base}" ${SV}/>` +
      `<path d="M39,113 q3,4 0,7 M161,113 q-3,4 0,7" fill="none" stroke="${skin.shade}" stroke-width="2" stroke-linecap="round"/>` +
      `<ellipse cx="100" cy="104" rx="60" ry="54" fill="${skin.base}" ${SV}/>` +
      `<ellipse cx="64" cy="136" rx="9" ry="5" fill="#ff9aa2" opacity=".38"/><ellipse cx="136" cy="136" rx="9" ry="5" fill="#ff9aa2" opacity=".38"/>` +
      MARKS[o.mark].draw(skin) +
      veMat(o.eyes, f.mat, skin) +
      f.draw() +
      hair.front(c) +
      veMay(o.brows, f.may, c) + // vẽ đè lên tóc mái để luôn thấy lông mày (kiểu chibi)
      ACCESSORIES[o.accessory].draw() +
      f.them()
    );
  }

  /** Điền giá trị mặc định và sửa lựa chọn không hợp lệ (ví dụ tóc nữ cho nhân vật nam). */
  function normalizeCharacter(opts) {
    const o = Object.assign({}, opts);
    o.gender = o.gender === 'female' ? 'female' : 'male';
    if (!HAIR[o.gender][o.hair]) o.hair = Object.keys(HAIR[o.gender])[0];
    if (!FACES[o.expression]) o.expression = 'vui-ve';
    if (!HAIR_COLORS[o.hairColor]) o.hairColor = 'den';
    if (!SKIN_TONES[o.skin]) o.skin = 'sang';
    if (!ACCESSORIES[o.accessory]) o.accessory = 'khong';
    if (!EYES[o.eyes]) o.eyes = 'tron';
    if (!BROWS[o.brows]) o.brows = 'cong';
    if (!MARKS[o.mark]) o.mark = 'khong';
    return o;
  }

  function renderCharacter(opts) {
    const o = normalizeCharacter(opts);
    const label = `Nhân vật ${o.gender === 'female' ? 'nữ' : 'nam'}, ${FACES[o.expression].name.toLowerCase()}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 320" role="img" aria-label="${label}" class="pa-character">${characterInner(o)}</svg>`;
  }

  /* ============================================================
   * 2. BÀN HỌC — khung vẽ 260 x 190
   *    Đồ trang trí chỉ đặt ở hai bên (x < 90 hoặc x > 170)
   *    để không che nhân vật ngồi giữa bàn.
   * ============================================================ */

  const deco = {
    books: (x) =>
      `<rect x="${x - 22}" y="82" width="44" height="11" rx="2" fill="${RED}" ${S}/>` +
      `<rect x="${x - 18}" y="71" width="38" height="11" rx="2" fill="#4f8fd8" ${S}/>` +
      `<rect x="${x - 20}" y="60" width="34" height="11" rx="2" fill="#f2b93b" ${S}/>`,
    plant: (x, leaf = '#4fae6d', pot = '#d9825b') =>
      `<ellipse cx="${x - 11}" cy="62" rx="6" ry="14" transform="rotate(-32 ${x - 11} 62)" fill="${leaf}" ${S}/>` +
      `<ellipse cx="${x + 11}" cy="62" rx="6" ry="14" transform="rotate(32 ${x + 11} 62)" fill="${leaf}" ${S}/>` +
      `<ellipse cx="${x}" cy="56" rx="7" ry="17" fill="${leaf}" ${S}/>` +
      `<path d="M${x - 13},74 L${x + 13},74 L${x + 9},94 L${x - 9},94 Z" fill="${pot}" ${S}/>`,
    lamp: (x, color) =>
      `<path d="M${x + 4},52 L${x + 32},57 L${x + 42},92 L${x - 8},92 Z" fill="#ffe680" opacity=".4"/>` +
      `<path d="M${x},90 L${x},64 L${x + 16},46" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<ellipse cx="${x}" cy="91" rx="14" ry="4.5" fill="${color}" ${S}/>` +
      `<path d="M${x + 8},32 L${x + 32},38 L${x + 34},56 L${x + 2},50 Z" fill="${color}" ${S}/>`,
    globe: (x) =>
      `<rect x="${x - 2.5}" y="82" width="5" height="10" fill="#8a5a3c" ${S}/>` +
      `<rect x="${x - 12}" y="90" width="24" height="5" rx="2" fill="#8a5a3c" ${S}/>` +
      `<circle cx="${x}" cy="66" r="18" fill="#6ec3f4" ${S}/>` +
      `<path d="M${x - 10},56 q6,-6 12,-2 q4,6 -2,10 q-8,2 -10,-8 Z M${x + 2},70 q8,-4 10,4 q-4,8 -10,4 Z" fill="#6bbf59"/>`,
    cup: (x, color) =>
      `<rect x="${x - 9}" y="50" width="5" height="26" fill="#f2b93b" ${S} transform="rotate(-12 ${x - 6} 74)"/>` +
      `<rect x="${x + 3}" y="48" width="5" height="28" fill="${RED}" ${S} transform="rotate(10 ${x + 5} 74)"/>` +
      `<rect x="${x - 3}" y="46" width="5" height="30" fill="#4f8fd8" ${S}/>` +
      `<rect x="${x - 11}" y="72" width="22" height="22" rx="3" fill="${color}" ${S}/>`,
    mug: (x, color) =>
      `<path d="M${x + 9},80 q10,0 10,6 q0,6 -10,6" ${LINE}/>` +
      `<rect x="${x - 10}" y="76" width="20" height="18" rx="4" fill="${color}" ${S}/>` +
      `<path d="M${x - 4},70 q-4,-5 0,-10 M${x + 4},70 q-4,-5 0,-10" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`,
    frame: (x) =>
      `<rect x="${x - 15}" y="62" width="30" height="32" rx="3" fill="#ffffff" ${S}/>` +
      `<rect x="${x - 10}" y="67" width="20" height="22" fill="#ffe3ec"/>` +
      `<path d="M${x},86 q-10,-8 -6,-13 q4,-3 6,2 q2,-5 6,-2 q4,5 -6,13 Z" fill="${RED}"/>`,
    laptop: (x) =>
      `<rect x="${x - 25}" y="52" width="50" height="34" rx="4" fill="#2d3a4f" ${S}/>` +
      `<rect x="${x - 20}" y="57" width="40" height="24" rx="1" fill="#9fe0ff"/>` +
      `<path d="M${x - 31},94 L${x + 31},94 L${x + 26},86 L${x - 26},86 Z" fill="#c9d2de" ${S}/>`,
    flask: (x, liquid = '#5fd3a6') =>
      `<path d="M${x - 5},48 h10 v14 l12,26 a4,4 0 0 1 -4,6 h-26 a4,4 0 0 1 -4,-6 l12,-26 Z" fill="#f2fbff" ${S}/>` +
      `<path d="M${x - 11},76 L${x + 11},76 L${x + 16},87 a4,4 0 0 1 -3.5,5.5 h-25 a4,4 0 0 1 -3.5,-5.5 Z" fill="${liquid}"/>` +
      `<circle cx="${x - 2}" cy="70" r="2.5" fill="${liquid}"/><circle cx="${x + 4}" cy="64" r="1.8" fill="${liquid}"/>` +
      `<rect x="${x - 8}" y="45" width="16" height="5" rx="2" fill="#dfe7ee" ${S}/>`,
    tubes: (x) => {
      const tube = (tx, c) =>
        `<path d="M${tx - 5},52 v32 a5,5 0 0 0 10,0 v-32 Z" fill="#f2fbff" ${S}/>` +
        `<path d="M${tx - 3.5},68 v16 a3.5,3.5 0 0 0 7,0 v-16 Z" fill="${c}"/>`;
      return (
        tube(x - 16, '#ff8a8a') + tube(x, '#ffd766') + tube(x + 16, '#8a6fe0') +
        `<rect x="${x - 28}" y="76" width="56" height="8" rx="2" fill="#9fb3c4" ${S}/>` +
        `<rect x="${x - 28}" y="88" width="56" height="6" rx="2" fill="#9fb3c4" ${S}/>`
      );
    },
    trophy: (x) =>
      `<path d="M${x - 12},54 q-12,0 -10,10 q2,8 12,8 M${x + 12},54 q12,0 10,10 q-2,8 -12,8" ${LINE}/>` +
      `<path d="M${x - 13},48 h26 v12 a13,13 0 0 1 -26,0 Z" fill="#f6c443" ${S}/>` +
      `<rect x="${x - 3}" y="73" width="6" height="10" fill="#f6c443" ${S}/>` +
      `<rect x="${x - 12}" y="82" width="24" height="12" rx="2" fill="#8a5a3c" ${S}/>` +
      star(x, 58, 6, '#fff6d6'),
    monitor: (x) =>
      `<rect x="${x - 4}" y="78" width="8" height="12" fill="#3a4160" ${S}/>` +
      `<rect x="${x - 16}" y="89" width="32" height="5" rx="2" fill="#3a4160" ${S}/>` +
      `<rect x="${x - 30}" y="40" width="60" height="40" rx="5" fill="#11141f" ${S}/>` +
      `<rect x="${x - 25}" y="45" width="50" height="30" rx="2" fill="#7c5cff"/>` +
      `<path d="M${x - 18},66 l8,-10 l8,8 l8,-12 l10,14" fill="none" stroke="#3df5c8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    rocket: (x) =>
      `<path d="M${x - 9},74 l-9,18 h10 Z M${x + 9},74 l9,18 h-10 Z" fill="${RED}" ${S}/>` +
      `<path d="M${x},40 Q${x + 14},58 ${x + 9},88 h-18 Q${x - 14},58 ${x},40 Z" fill="#f4f6fb" ${S}/>` +
      `<circle cx="${x}" cy="62" r="5" fill="#6ec3f4" ${S}/>`,
    planet: (x) =>
      `<rect x="${x - 2.5}" y="80" width="5" height="12" fill="#b9a6ff" ${S}/>` +
      `<rect x="${x - 11}" y="90" width="22" height="5" rx="2" fill="#b9a6ff" ${S}/>` +
      `<circle cx="${x}" cy="64" r="15" fill="#ffb86b" ${S}/>` +
      `<path d="M${x - 9},58 q9,5 18,0" fill="none" stroke="#e8904a" stroke-width="3" stroke-linecap="round"/>` +
      `<ellipse cx="${x}" cy="64" rx="25" ry="6" transform="rotate(-18 ${x} 64)" fill="none" stroke="${INK}" stroke-width="6"/>` +
      `<ellipse cx="${x}" cy="64" rx="25" ry="6" transform="rotate(-18 ${x} 64)" fill="none" stroke="#fff3c4" stroke-width="2.5"/>`,
    keyboard: (x) =>
      `<path d="M${x - 26},94 L${x + 26},94 L${x + 22},86 L${x - 22},86 Z" fill="#11141f" ${S}/>` +
      `<path d="M${x - 16},90 h32" stroke="#ff4fd8" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 4"/>`
  };

  // Hoạ tiết trên mặt trước bàn (vùng trống bên trái ngăn kéo: x 36–140, y 120–150)
  const panel = {
    leaves: () => [52, 82, 112].map((x) =>
      `<path d="M${x},146 q-12,-12 0,-22 q12,10 0,22 Z" fill="#4fae6d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`).join(''),
    hearts: () => [52, 84, 116].map((x) =>
      `<path d="M${x},146 q-15,-11 -9,-19 q6,-5 9,3 q3,-8 9,-3 q6,8 -9,19 Z" fill="#ffffff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`).join(''),
    waves: () =>
      `<path d="M40,130 q10,-9 20,0 t20,0 t20,0 t20,0 M40,143 q10,-9 20,0 t20,0 t20,0 t20,0" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`,
    sun: () =>
      `<g stroke="#ef6f5e" stroke-width="3.5" stroke-linecap="round"><path d="M86,120 v3 M86,147 v3 M68,135 h5 M99,135 h5 M74,123 l3,3 M98,123 l-3,3 M74,147 l3,-3 M98,147 l-3,-3"/></g>` +
      `<circle cx="86" cy="135" r="8" fill="#ef6f5e" stroke="${INK}" stroke-width="2"/>`,
    vines: () =>
      `<path d="M30,116 q14,14 28,0 q14,14 28,0 q14,14 28,0 q14,14 28,0" fill="none" stroke="#3f8f4f" stroke-width="3.5" stroke-linecap="round"/>` +
      [44, 72, 100, 128].map((x) =>
        `<ellipse cx="${x}" cy="131" rx="5.5" ry="9" fill="#4fae6d" stroke="${INK}" stroke-width="2"/>`).join(''),
    stars: () => star(54, 134, 10, '#ffd766') + star(88, 128, 6, '#ffffff') + star(116, 140, 8, '#ffd766'),
    atom: () =>
      `<g fill="none" stroke="#33c6b3" stroke-width="3"><ellipse cx="88" cy="135" rx="19" ry="6.5"/><ellipse cx="88" cy="135" rx="19" ry="6.5" transform="rotate(60 88 135)"/><ellipse cx="88" cy="135" rx="19" ry="6.5" transform="rotate(-60 88 135)"/></g>` +
      `<circle cx="88" cy="135" r="4" fill="#ef6f5e" stroke="${INK}" stroke-width="2"/>`,
    led: () =>
      `<rect x="38" y="140" width="100" height="6" rx="3" fill="#ff4fd8"/>` +
      `<rect x="38" y="140" width="34" height="6" rx="3" fill="#3df5c8"/>` +
      `<rect x="104" y="140" width="34" height="6" rx="3" fill="#7c5cff"/>` +
      `<path d="M52,124 l8,8 l-8,0 Z M78,122 h12 v12 h-12 Z" fill="none" stroke="#3df5c8" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<circle cx="116" cy="128" r="6" fill="none" stroke="#ff4fd8" stroke-width="2.5"/>`,
    royal: () =>
      [48, 72, 96, 120].map((x) =>
        `<path d="M${x},124 l9,10 l-9,10 l-9,-10 Z" fill="#f6c443" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`).join('')
  };

  const DESKS = [
    { id: 'go-soi', name: 'Gỗ sồi mộc', price: 0, note: 'Bàn mặc định, ai cũng có',
      top: '#dba56c', edge: '#b97a45', body: '#c98d55', drawer: '#dba56c', leg: '#9c6236', knob: '#6b4a2b',
      deco: () => deco.books(58) + deco.mug(202, '#ffffff') },
    { id: 'bac-ha', name: 'Bạc hà tươi', price: 50, note: 'Chậu cây nhỏ và ống bút',
      top: '#c6f0e1', edge: '#7fd1b5', body: '#a2e0cb', drawer: '#ecfbf6', leg: '#5fb89a', knob: '#3f9a7c',
      panel: panel.leaves, deco: () => deco.plant(56) + deco.cup(202, '#ffffff') },
    { id: 'anh-dao', name: 'Hồng anh đào', price: 80, note: 'Khung ảnh và hoạ tiết trái tim',
      top: '#ffd6e2', edge: '#f59ab5', body: '#ffb7cb', drawer: '#fff1f6', leg: '#e77f9f', knob: '#d85f86',
      panel: panel.hearts, deco: () => deco.frame(56) + deco.cup(202, '#fff7c2') },
    { id: 'dai-duong', name: 'Xanh đại dương', price: 120, note: 'Quả địa cầu và chồng sách',
      top: '#c4e3ff', edge: '#5aa3e6', body: '#7fbdf2', drawer: '#e8f4ff', leg: '#3d7fc4', knob: '#2c64a3',
      panel: panel.waves, deco: () => deco.globe(56) + deco.books(204) },
    { id: 'nang-vang', name: 'Nắng vàng', price: 150, note: 'Đèn bàn sáng và cốc trà',
      top: '#ffeaa8', edge: '#f2b93b', body: '#ffd766', drawer: '#fff7d9', leg: '#d99a1e', knob: '#b87d0c',
      panel: panel.sun, deco: () => deco.lamp(44, '#ef6f5e') + deco.mug(206, '#ffffff') },
    { id: 'rung-nhiet-doi', name: 'Rừng nhiệt đới', price: 200, note: 'Phủ kín cây xanh và dây leo',
      top: '#d2ebbd', edge: '#5f9e4a', body: '#7dbb63', drawer: '#e6f5d9', leg: '#6b4a2b', knob: '#3f6f2f',
      panel: panel.vines,
      deco: () => deco.plant(40, '#3f8f4f', '#c98d55') + deco.plant(70, '#6bbf59', '#f2b93b') + deco.plant(206, '#4fae6d', '#d9825b') },
    { id: 'thien-ha', name: 'Tím thiên hà', price: 260, note: 'Tên lửa, hành tinh và sao',
      top: '#dbd0ff', edge: '#8a6fe0', body: '#6a4fc4', drawer: '#b9a6ff', leg: '#4b3696', knob: '#ffd766',
      panel: panel.stars, deco: () => deco.rocket(56) + deco.planet(204) },
    { id: 'thi-nghiem', name: 'Phòng thí nghiệm', price: 320, note: 'Bình tam giác và giá ống nghiệm',
      top: '#f1f5f8', edge: '#9fb3c4', body: '#dfe7ee', drawer: '#33c6b3', leg: '#7d8fa1', knob: '#ffffff',
      panel: panel.atom, deco: () => deco.flask(54) + deco.tubes(202) },
    { id: 'neon', name: 'Neon game thủ', price: 400, note: 'Màn hình và dải đèn LED',
      top: '#2f3550', edge: '#7c5cff', body: '#1b1f2e', drawer: '#2f3550', leg: '#11141f', knob: '#3df5c8',
      panel: panel.led, deco: () => deco.keyboard(58) + deco.monitor(200) },
    { id: 'hoang-gia', name: 'Hoàng gia', price: 500, note: 'Đỏ nhung viền vàng, có cúp',
      top: '#c4374c', edge: '#f6c443', body: '#8f1d2e', drawer: '#b3273a', leg: '#f6c443', knob: '#f6c443',
      panel: panel.royal, deco: () => deco.trophy(54) + deco.lamp(190, '#f6c443') }
  ];

  function deskInner(id) {
    const d = DESKS.find((x) => x.id === id) || DESKS[0];
    return (
      `<rect x="34" y="150" width="16" height="36" rx="4" fill="${d.leg}" ${S}/>` +
      `<rect x="210" y="150" width="16" height="36" rx="4" fill="${d.leg}" ${S}/>` +
      `<rect x="26" y="110" width="208" height="46" rx="7" fill="${d.body}" ${S}/>` +
      (d.panel ? d.panel() : '') +
      `<rect x="150" y="120" width="74" height="28" rx="5" fill="${d.drawer}" ${S}/>` +
      `<circle cx="187" cy="134" r="4.5" fill="${d.knob}" ${S}/>` +
      `<path d="M32,82 L228,82 L246,102 L14,102 Z" fill="${d.top}" ${S}/>` +
      `<rect x="12" y="102" width="236" height="12" rx="4" fill="${d.edge}" ${S}/>` +
      d.deco()
    );
  }

  function renderDesk(id) {
    const d = DESKS.find((x) => x.id === id) || DESKS[0];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 190" role="img" aria-label="Bàn ${d.name}" class="pa-desk">${deskInner(d.id)}</svg>`;
  }

  /* ============================================================
   * 3. CHỖ NGỒI — nhân vật ngồi sau bàn, khung vẽ 260 x 300
   *    Dùng cho phòng học đôi và phòng học nhóm.
   * ============================================================ */
  function renderSeat(opts) {
    const o = opts || {};
    const person = o.empty
      ? `<g opacity=".28"><ellipse cx="130" cy="118" rx="38" ry="36" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="7 7"/>` +
        `<path d="M100,196 Q100,160 130,158 Q160,160 160,196" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="7 7"/></g>`
      : `<g transform="translate(60,50) scale(0.7)">${characterInner(o.character)}</g>`;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 300" role="img" aria-label="${o.empty ? 'Chỗ ngồi còn trống' : 'Chỗ ngồi'}" class="pa-seat">` +
      person +
      `<g transform="translate(0,110)"${o.empty ? ' opacity=".55"' : ''}>${deskInner(o.deskId)}</g>` +
      `</svg>`
    );
  }

  /* ============================================================
   * 4. TỦ SÁCH — khung vẽ 240 x 340, mỗi cuốn sách là một thẻ <a>
   * ============================================================ */
  const SUBJECTS = [
    { id: 'toan', name: 'Toán', color: '#e2504c', href: '#' },
    { id: 'ly', name: 'Vật lí', color: '#4f8fd8', href: '#' },
    { id: 'hoa', name: 'Hoá học', color: '#33b39a', href: '#' },
    { id: 'sinh', name: 'Sinh học', color: '#6bbf59', href: '#' },
    { id: 'su', name: 'Lịch sử', color: '#b0683a', href: '#' },
    { id: 'dia', name: 'Địa lí', color: '#f2a93b', href: '#' },
    { id: 'anh', name: 'Tiếng Anh', color: '#8a6fe0', href: '#' }
  ];

  function renderBookshelf(subjects) {
    const list = (subjects && subjects.length ? subjects : SUBJECTS).slice(0, 9);
    // 3 ngăn, mỗi ngăn tối đa 3 cuốn; baseline là mép trên của tấm ván
    const baselines = [112, 214, 316];
    const heights = [80, 72, 84];
    const books = list.map((s, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const h = heights[(i + row) % 3];
      const x = 32 + col * 38;
      const y = baselines[row] - h;
      const ext = /^https?:/.test(s.href || '') ? ' target="_blank" rel="noopener"' : '';
      const sapCo = !s.href;
      // Chữ trên gáy sách: dùng `spine` nếu có (tên ngắn); tên dài thì xuống 2 dòng rồi mới thu nhỏ chữ.
      // Sách "Sắp có" chừa chỗ dưới chân cho nhãn.
      const spine = s.spine || s.name;
      const dai = sapCo ? h - 44 : h - 30;
      const tam = sapCo ? y + (h - 20) / 2 : y + h / 2;
      let dong = [spine];
      if (spine.length * 0.56 * 12.5 > dai && spine.includes(' ')) {
        const tu = spine.split(' ');
        let tot = null;
        for (let k = 1; k < tu.length; k++) {
          const cap = [tu.slice(0, k).join(' '), tu.slice(k).join(' ')];
          if (!tot || Math.max(...cap.map((c) => c.length)) < Math.max(...tot.map((c) => c.length))) tot = cap;
        }
        dong = tot;
      }
      const dai1 = Math.max(...dong.map((c) => c.length));
      const fs = Math.min(dong.length > 1 ? 11 : 12.5, dai / (dai1 * 0.56));
      const chu = dong.map((c, k) =>
        `<tspan x="0" y="${((k - (dong.length - 1) / 2) * fs * 1.05).toFixed(1)}">${c}</tspan>`).join('');
      const body =
        `<title>${s.name}${sapCo ? ' (sắp có)' : ''}</title>` +
        `<rect x="${x}" y="${y}" width="34" height="${h}" rx="3" fill="${s.color}" ${S}/>` +
        `<rect x="${x}" y="${y + 9}" width="34" height="5" fill="#ffffff" opacity=".55"/>` +
        `<rect x="${x}" y="${y + h - 14}" width="34" height="5" fill="#ffffff" opacity=".55"/>` +
        `<text transform="translate(${x + 17},${tam}) rotate(-90)" text-anchor="middle" dominant-baseline="central" font-family="inherit" font-size="${fs.toFixed(1)}" font-weight="800" fill="#ffffff">${chu}</text>`;
      // Môn chưa có link: sách mờ, không bấm được, dán nhãn "Sắp có" ở chân sách
      if (sapCo) {
        return (
          `<g class="pa-book pa-book--sap-co" data-subject="${s.id}" role="img" aria-label="Môn ${s.name}: sắp có trò chơi">` +
          `<g opacity=".45">${body}</g>` +
          `<rect x="${x - 2}" y="${y + h - 22}" width="38" height="17" rx="4" fill="#ffffff" stroke="${INK}" stroke-width="2"/>` +
          `<text x="${x + 17}" y="${y + h - 13.5}" text-anchor="middle" dominant-baseline="central" font-family="inherit" font-size="9" font-weight="800" fill="${INK}">Sắp có</text>` +
          `</g>`
        );
      }
      return (
        `<a href="${s.href}"${ext} class="pa-book" data-subject="${s.id}" aria-label="Mở trò chơi môn ${s.name}">` +
        body +
        `</a>`
      );
    }).join('');
    // Đồ trang trí lấp chỗ trống bên phải mỗi ngăn
    const fillers =
      `<g transform="translate(104,18)">${deco.plant(72, '#4fae6d', '#f2b93b')}</g>` +
      `<g transform="translate(108,120)">${deco.globe(70)}</g>` +
      `<g transform="translate(108,222)">${deco.trophy(70)}</g>`;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 340" role="group" aria-label="Tủ sách trò chơi các môn học" class="pa-bookshelf">` +
      `<rect x="8" y="8" width="224" height="324" rx="10" fill="#b97a45" ${S}/>` +
      `<rect x="22" y="22" width="196" height="296" rx="4" fill="#8a5a3c" ${S}/>` +
      fillers + books +
      `<rect x="20" y="112" width="200" height="10" fill="#c98d55" ${S}/>` +
      `<rect x="20" y="214" width="200" height="10" fill="#c98d55" ${S}/>` +
      `<rect x="20" y="316" width="200" height="6" fill="#c98d55" ${S}/>` +
      `</svg>`
    );
  }

  /* ============================================================
   * 5. DANH MỤC LỰA CHỌN — dùng để dựng màn hình tạo nhân vật và cửa hàng
   * ============================================================ */
  const toList = (obj) => Object.keys(obj).map((id) => Object.assign({ id }, obj[id], { draw: undefined, back: undefined, front: undefined, them: undefined }));

  const CHARACTER_OPTIONS = {
    genders: [{ id: 'male', name: 'Nam' }, { id: 'female', name: 'Nữ' }],
    hair: { male: toList(HAIR.male), female: toList(HAIR.female) },
    expressions: toList(FACES),
    hairColors: toList(HAIR_COLORS),
    skinTones: toList(SKIN_TONES),
    eyes: toList(EYES),
    brows: toList(BROWS),
    marks: toList(MARKS),
    accessories: toList(ACCESSORIES)
  };

  const MAC_DINH_MAT = { eyes: 'tron', brows: 'cong', mark: 'khong' };
  const DEFAULT_CHARACTER = {
    male: { gender: 'male', hair: 'nam-ngan', expression: 'vui-ve', hairColor: 'den', skin: 'sang', accessory: 'khong', ...MAC_DINH_MAT },
    female: { gender: 'female', hair: 'nu-dai-thang', expression: 'vui-ve', hairColor: 'den', skin: 'sang', accessory: 'khong', ...MAC_DINH_MAT }
  };

  root.PeerAssets = {
    CHARACTER_OPTIONS,
    DEFAULT_CHARACTER,
    DESKS: DESKS.map(({ id, name, price, note }) => ({ id, name, price, note })),
    SUBJECTS,
    normalizeCharacter,
    renderCharacter,
    renderDesk,
    renderSeat,
    renderBookshelf
  };
})(typeof window !== 'undefined' ? window : globalThis);
