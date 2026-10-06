/*
 * peer-assets.js — Bộ hình vẽ SVG cho trang Peer Learning
 * ---------------------------------------------------------------
 * Không cần thư viện, không cần build. Nhúng bằng:
 *   <script src="assets/peer-assets.js"></script>
 * rồi dùng qua biến toàn cục `PeerAssets`.
 *
 *   PeerAssets.renderCharacter({ gender, hair, expression, hairColor, skin, accessory })
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
   * 1. NHÂN VẬT — khung vẽ 200 x 320
   *    Thứ tự lớp: tóc sau → tay → chân → áo → cổ → đầu → mặt → tóc trước → phụ kiện
   * ============================================================ */

  const SKIN_TONES = {
    sang: { name: 'Sáng', base: '#fbe0c8', shade: '#f0c4a2' },
    tunhien: { name: 'Tự nhiên', base: '#f3c9a2', shade: '#e3ac80' },
    ngam: { name: 'Ngăm', base: '#d9a273', shade: '#c18656' }
  };

  const HAIR_COLORS = {
    den: { name: 'Đen', hex: '#2b2326' },
    nauden: { name: 'Nâu đen', hex: '#4a3128' },
    nau: { name: 'Nâu', hex: '#7a4a2e' },
    hatde: { name: 'Hạt dẻ', hex: '#a8643a' },
    xanh: { name: 'Xanh than', hex: '#3f5f9e', unlockPrice: 120 },
    hong: { name: 'Hồng đào', hex: '#e07f9f', unlockPrice: 120 }
  };

  const NAVY = '#27375e';
  const SHIRT = '#ffffff';
  const RED = '#e2504c';

  // Phần đầu tóc phủ lên trán, dùng chung cho nhiều kiểu
  const HAIR = {
    male: {
      'nam-ngan': {
        name: 'Ngắn gọn',
        back: () => '',
        front: (c) =>
          `<path d="M42,98 Q36,30 100,30 Q164,30 158,98 Q154,78 144,66 Q128,74 112,62 Q96,74 76,64 Q60,70 54,78 Q46,86 42,98 Z" fill="${c}" ${S}/>`
      },
      'nam-re-ngoi': {
        name: 'Rẽ ngôi',
        back: () => '',
        front: (c) =>
          `<path d="M42,100 Q34,28 100,28 Q166,28 158,100 Q156,80 146,70 Q112,82 70,56 Q52,72 42,100 Z" fill="${c}" ${S}/>` +
          `<path d="M70,56 Q84,40 104,36" ${LINE} opacity=".45"/>`
      },
      'nam-xoan': {
        name: 'Xoăn',
        back: () => '',
        front: (c) => {
          const curls = [
            [50, 80, 15], [58, 60, 17], [74, 44, 18], [96, 36, 19],
            [120, 38, 19], [140, 50, 18], [152, 68, 16], [154, 86, 13]
          ];
          const cap = `M44,90 Q40,34 100,34 Q160,34 156,90 Q140,64 100,62 Q60,64 44,90 Z`;
          return (
            curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${S}/>`).join('') +
            `<path d="${cap}" fill="${c}"/>` +
            curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.5}" fill="${c}"/>`).join('') +
            `<path d="M70,50 q8,-8 16,0 M104,44 q8,-8 16,0 M132,60 q8,-6 14,2" ${LINE} opacity=".35"/>`
          );
        }
      }
    },
    female: {
      'nu-dai-thang': {
        name: 'Dài thẳng',
        back: (c) =>
          `<path d="M38,100 Q32,26 100,26 Q168,26 162,100 L168,196 Q152,206 136,196 L134,110 L66,110 L64,196 Q48,206 32,196 Z" fill="${c}" ${S}/>`,
        front: (c) =>
          `<path d="M42,100 Q36,30 100,30 Q164,30 158,100 Q156,84 150,76 Q126,82 100,58 Q74,82 50,76 Q44,84 42,100 Z" fill="${c}" ${S}/>`
      },
      'nu-duoi-ngua': {
        name: 'Buộc đuôi ngựa',
        back: (c) =>
          `<path d="M138,46 Q192,50 186,122 Q184,160 162,180 Q172,144 158,112 Q150,80 138,46 Z" fill="${c}" ${S}/>`,
        front: (c) =>
          `<path d="M42,100 Q36,30 100,30 Q164,30 158,100 Q156,80 148,70 Q110,80 72,58 Q52,72 42,100 Z" fill="${c}" ${S}/>` +
          `<path d="M44,98 Q40,120 49,134 L53,104 Z" fill="${c}" ${S}/>` +
          `<circle cx="154" cy="54" r="7" fill="${RED}" ${S}/>`
      },
      'nu-bob': {
        name: 'Tóc bob',
        back: (c) =>
          `<path d="M36,104 Q30,24 100,24 Q170,24 164,104 Q170,146 150,152 Q140,154 134,146 L134,104 L66,104 L66,146 Q60,154 50,152 Q30,146 36,104 Z" fill="${c}" ${S}/>`,
        front: (c) =>
          `<path d="M42,100 Q36,30 100,30 Q164,30 158,100 Q156,86 152,78 Q100,64 48,78 Q44,86 42,100 Z" fill="${c}" ${S}/>`
      }
    }
  };

  const eye = (cx, cy, rx, ry) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}"/>` +
    `<circle cx="${cx - 2}" cy="${cy - 3}" r="${rx * 0.36}" fill="#fff"/>`;
  const blush = (o) =>
    `<ellipse cx="64" cy="121" rx="9" ry="5" fill="#ff8f8f" opacity="${o}"/>` +
    `<ellipse cx="136" cy="121" rx="9" ry="5" fill="#ff8f8f" opacity="${o}"/>`;
  const star = (x, y, r, fill) =>
    `<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;

  const FACES = {
    'vui-ve': {
      name: 'Vui vẻ',
      draw: () =>
        `<path d="M68,87 Q78,82 88,87 M112,87 Q122,82 132,87" ${LINE}/>` +
        eye(78, 104, 6.5, 8.5) + eye(122, 104, 6.5, 8.5) +
        `<path d="M88,122 Q100,135 112,122" ${LINE}/>` +
        blush(0.55)
    },
    'hao-huc': {
      name: 'Háo hức',
      draw: () =>
        `<path d="M66,83 Q78,74 90,83 M110,83 Q122,74 134,83" ${LINE}/>` +
        eye(78, 104, 8, 10.5) + eye(122, 104, 8, 10.5) +
        `<circle cx="81" cy="109" r="1.8" fill="#fff"/><circle cx="125" cy="109" r="1.8" fill="#fff"/>` +
        `<path d="M86,120 Q100,144 114,120 Z" fill="#7a2d3a" ${S}/>` +
        `<path d="M93,131 Q100,126 107,131 Q100,138 93,131 Z" fill="#ff8a8a"/>` +
        blush(0.75) +
        star(26, 52, 11, '#ffd766') + star(176, 40, 13, '#ffd766') + star(182, 78, 7, '#ffffff')
    },
    'buon-ngu': {
      name: 'Buồn ngủ',
      draw: () =>
        `<path d="M68,92 L88,94 M112,94 L132,92" ${LINE}/>` +
        `<path d="M69,104 Q78,113 87,104 Z M113,104 Q122,113 131,104 Z" fill="${INK}" ${S}/>` +
        `<ellipse cx="100" cy="126" rx="5.5" ry="6.5" fill="#7a2d3a" ${S}/>` +
        blush(0.3) +
        `<g font-family="inherit" font-weight="800" fill="#5a7bd6" stroke="#fff" stroke-width="1" paint-order="stroke">` +
        `<text x="160" y="52" font-size="24">Z</text><text x="178" y="32" font-size="17">z</text><text x="190" y="18" font-size="12">z</text></g>`
    },
    'buon-ba': {
      name: 'Buồn bã',
      draw: () =>
        `<path d="M66,91 Q78,86 90,82 M110,82 Q122,86 134,91" ${LINE}/>` +
        eye(78, 105, 6, 8) + eye(122, 105, 6, 8) +
        `<path d="M88,130 Q100,120 112,130" ${LINE}/>` +
        `<path d="M134,114 Q141,125 134,129 Q127,125 134,114 Z" fill="#6ec3f4" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
    }
  };

  const ACCESSORIES = {
    'khong': { name: 'Không đeo', price: 0, draw: () => '' },
    'kinh-tron': {
      name: 'Kính tròn', price: 60,
      draw: () =>
        `<circle cx="78" cy="104" r="15" fill="#ffffff" fill-opacity=".22" ${S}/>` +
        `<circle cx="122" cy="104" r="15" fill="#ffffff" fill-opacity=".22" ${S}/>` +
        `<path d="M93,102 Q100,98 107,102 M63,102 L46,98 M137,102 L154,98" ${LINE}/>`
    },
    'tai-nghe': {
      name: 'Tai nghe', price: 100,
      draw: () =>
        `<path d="M40,96 Q38,20 100,20 Q162,20 160,96" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>` +
        `<path d="M40,96 Q38,20 100,20 Q162,20 160,96" fill="none" stroke="#ef6f5e" stroke-width="5.5" stroke-linecap="round"/>` +
        `<rect x="28" y="84" width="20" height="36" rx="9" fill="#ef6f5e" ${S}/>` +
        `<rect x="152" y="84" width="20" height="36" rx="9" fill="#ef6f5e" ${S}/>`
    },
    'mu-luoi-trai': {
      name: 'Mũ lưỡi trai', price: 140,
      draw: () =>
        `<path d="M44,74 Q40,22 100,22 Q160,22 156,74 Z" fill="#4f8fd8" ${S}/>` +
        `<path d="M44,74 Q104,58 176,76 Q182,86 170,86 L44,80 Z" fill="#3d7fc4" ${S}/>` +
        `<circle cx="100" cy="24" r="5" fill="#ffd766" ${S}/>`
    },
    'no-buoc-toc': {
      name: 'Nơ buộc tóc', price: 80,
      draw: () =>
        `<path d="M132,40 L112,28 Q108,40 114,52 Z M132,40 L152,28 Q156,40 150,52 Z" fill="${RED}" ${S}/>` +
        `<circle cx="132" cy="40" r="6" fill="#ff8a8a" ${S}/>`
    }
  };

  function bodyMarkup(gender, skin) {
    const arm =
      `<path d="M68,158 Q50,162 47,186 L45,202 L63,204 L68,182 Z" fill="${SHIRT}" ${S}/>` +
      `<path d="M45,202 L63,204 L61,226 Q53,236 45,226 Z" fill="${skin.base}" ${S}/>`;
    const arms = arm + `<g transform="translate(200,0) scale(-1,1)">${arm}</g>`;
    const torso = `<path d="M64,178 Q64,152 86,150 L114,150 Q136,152 136,178 L132,236 Q100,242 68,236 Z" fill="${SHIRT}" ${S}/>`;
    const collar =
      `<path d="M86,150 L100,166 L90,174 L80,156 Z M114,150 L100,166 L110,174 L120,156 Z" fill="${SHIRT}" ${S}/>`;
    const shoe = (x) => `<rect x="${x}" y="292" width="34" height="17" rx="8" fill="${INK}"/>`;

    if (gender === 'female') {
      const leg = (x) =>
        `<rect x="${x}" y="250" width="18" height="46" fill="${skin.base}" ${S}/>` +
        `<rect x="${x}" y="276" width="18" height="20" fill="#ffffff" ${S}/>`;
      return (
        arms + leg(76) + leg(106) + shoe(66) + shoe(100) + torso +
        `<path d="M68,222 L132,222 L144,262 Q100,272 56,262 Z" fill="${NAVY}" ${S}/>` +
        `<path d="M84,226 L78,264 M100,226 L100,267 M116,226 L122,264" ${LINE} opacity=".35"/>` +
        `<rect x="66" y="218" width="68" height="9" rx="3" fill="${NAVY}" ${S}/>` +
        collar +
        `<path d="M100,170 L86,162 L88,180 Z M100,170 L114,162 L112,180 Z" fill="${RED}" ${S}/>` +
        `<circle cx="100" cy="170" r="4.5" fill="${RED}" ${S}/>`
      );
    }
    return (
      arms +
      `<rect x="72" y="226" width="26" height="70" rx="7" fill="${NAVY}" ${S}/>` +
      `<rect x="102" y="226" width="26" height="70" rx="7" fill="${NAVY}" ${S}/>` +
      shoe(66) + shoe(100) + torso +
      `<rect x="68" y="226" width="64" height="9" rx="3" fill="${INK}"/>` +
      collar +
      `<path d="M95,166 L105,166 L108,198 L100,208 L92,198 Z" fill="${NAVY}" ${S}/>`
    );
  }

  function characterInner(opts) {
    const o = normalizeCharacter(opts);
    const skin = SKIN_TONES[o.skin];
    const hairHex = HAIR_COLORS[o.hairColor].hex;
    const hair = HAIR[o.gender][o.hair];
    return (
      hair.back(hairHex) +
      bodyMarkup(o.gender, skin) +
      `<rect x="90" y="136" width="20" height="22" fill="${skin.shade}" ${S}/>` +
      `<circle cx="45" cy="101" r="9" fill="${skin.base}" ${S}/><circle cx="155" cy="101" r="9" fill="${skin.base}" ${S}/>` +
      `<ellipse cx="100" cy="96" rx="56" ry="53" fill="${skin.base}" ${S}/>` +
      FACES[o.expression].draw() +
      hair.front(hairHex) +
      ACCESSORIES[o.accessory].draw()
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
      return (
        `<a href="${s.href || '#'}"${ext} class="pa-book" data-subject="${s.id}" aria-label="Mở trò chơi môn ${s.name}">` +
        `<title>${s.name}</title>` +
        `<rect x="${x}" y="${y}" width="34" height="${h}" rx="3" fill="${s.color}" ${S}/>` +
        `<rect x="${x}" y="${y + 9}" width="34" height="5" fill="#ffffff" opacity=".55"/>` +
        `<rect x="${x}" y="${y + h - 14}" width="34" height="5" fill="#ffffff" opacity=".55"/>` +
        `<text transform="translate(${x + 17},${y + h / 2}) rotate(-90)" text-anchor="middle" dominant-baseline="central" font-family="inherit" font-size="12.5" font-weight="800" fill="#ffffff">${s.name}</text>` +
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
  const toList = (obj) => Object.keys(obj).map((id) => Object.assign({ id }, obj[id], { draw: undefined, back: undefined, front: undefined }));

  const CHARACTER_OPTIONS = {
    genders: [{ id: 'male', name: 'Nam' }, { id: 'female', name: 'Nữ' }],
    hair: { male: toList(HAIR.male), female: toList(HAIR.female) },
    expressions: toList(FACES),
    hairColors: toList(HAIR_COLORS),
    skinTones: toList(SKIN_TONES),
    accessories: toList(ACCESSORIES)
  };

  const DEFAULT_CHARACTER = {
    male: { gender: 'male', hair: 'nam-ngan', expression: 'vui-ve', hairColor: 'den', skin: 'sang', accessory: 'khong' },
    female: { gender: 'female', hair: 'nu-dai-thang', expression: 'vui-ve', hairColor: 'den', skin: 'sang', accessory: 'khong' }
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
