export interface ThaiRegion {
  regionId: string;
  regionName: string;
  provinces: string[];
}

export const THAI_REGIONS: readonly ThaiRegion[] = [
  {
    regionId: 'north',
    regionName: 'เหนือ',
    provinces: [
      'เชียงราย',
      'เชียงใหม่',
      'น่าน',
      'พะเยา',
      'แพร่',
      'แม่ฮ่องสอน',
      'ลำปาง',
      'ลำพูน',
      'อุตรดิตถ์',
    ],
  },
  {
    regionId: 'northeast',
    regionName: 'ตะวันออกเฉียงเหนือ',
    provinces: [
      'กาฬสินธุ์',
      'ขอนแก่น',
      'ชัยภูมิ',
      'นครพนม',
      'นครราชสีมา',
      'บึงกาฬ',
      'บุรีรัมย์',
      'มหาสารคาม',
      'มุกดาหาร',
      'ยโสธร',
      'ร้อยเอ็ด',
      'เลย',
      'สกลนคร',
      'สุรินทร์',
      'ศรีสะเกษ',
      'หนองคาย',
      'หนองบัวลำภู',
      'อุดรธานี',
      'อุบลราชธานี',
      'อำนาจเจริญ',
    ],
  },
  {
    regionId: 'central',
    regionName: 'กลาง',
    provinces: [
      'กรุงเทพมหานคร',
      'กำแพงเพชร',
      'ชัยนาท',
      'นครนายก',
      'นครปฐม',
      'นครสวรรค์',
      'นนทบุรี',
      'ปทุมธานี',
      'พระนครศรีอยุธยา',
      'พิจิตร',
      'พิษณุโลก',
      'เพชรบูรณ์',
      'ลพบุรี',
      'สมุทรปราการ',
      'สมุทรสงคราม',
      'สมุทรสาคร',
      'สิงห์บุรี',
      'สุโขทัย',
      'สุพรรณบุรี',
      'สระบุรี',
      'อ่างทอง',
      'อุทัยธานี',
    ],
  },
  {
    regionId: 'east',
    regionName: 'ตะวันออก',
    provinces: [
      'จันทบุรี',
      'ฉะเชิงเทรา',
      'ชลบุรี',
      'ตราด',
      'ปราจีนบุรี',
      'ระยอง',
      'สระแก้ว',
    ],
  },
  {
    regionId: 'west',
    regionName: 'ตะวันตก',
    provinces: [
      'กาญจนบุรี',
      'ตาก',
      'ประจวบคีรีขันธ์',
      'เพชรบุรี',
      'ราชบุรี',
    ],
  },
  {
    regionId: 'south',
    regionName: 'ใต้',
    provinces: [
      'กระบี่',
      'ชุมพร',
      'ตรัง',
      'นครศรีธรรมราช',
      'นราธิวาส',
      'ปัตตานี',
      'พังงา',
      'พัทลุง',
      'ภูเก็ต',
      'ยะลา',
      'ระนอง',
      'สงขลา',
      'สตูล',
      'สุราษฎร์ธานี',
    ],
  },
] as const;

export const REGION_NAMES = THAI_REGIONS.map((r) => r.regionName) as [string, ...string[]];
export const REGION_IDS = THAI_REGIONS.map((r) => r.regionId) as [string, ...string[]];

export function getProvincesByRegion(regionIdentifier?: string | null): string[] {
  if (!regionIdentifier) return [];
  const found = THAI_REGIONS.find(
    (r) => r.regionId === regionIdentifier || r.regionName === regionIdentifier
  );
  return found ? [...found.provinces] : [];
}

export function isProvinceInRegion(region: string, province: string): boolean {
  if (!region || !province) return false;
  const provinces = getProvincesByRegion(region);
  return provinces.includes(province);
}
