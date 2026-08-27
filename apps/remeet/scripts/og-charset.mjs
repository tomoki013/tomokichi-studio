/**
 * What the invitation OG image is allowed to need a glyph for.
 *
 * The Worker has no system fonts, so anything drawn into the preview must be
 * covered by a font shipped in the bundle — and a full Japanese font is several
 * megabytes, which is most of a Worker's size budget. So the charset is curated
 * and the renderer degrades: `coverage.json` is emitted alongside the fonts and
 * a label containing anything outside it is dropped rather than drawn as tofu.
 */

/** The fixed chrome: the wordmark, the countdown, the unit. */
export const SERIF_CHARS = "Remet0123456789DAYS ♡";

/**
 * Copy that is always drawn, whatever the invitation is. Kept apart from the
 * place-name kanji because these can never be allowed to fall out of the
 * subset — a missing glyph here is a hole in every preview, not a label the
 * renderer can decide to drop.
 */
const FIXED_COPY =
  "次に会う日まで、一緒に待とう。会えるまであと日今" + "Waitforthenextimeyoumet,gher.DAYSUNTIL";

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.'’-–—()&/";

const KANA =
  "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをん" +
  "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶー・";

/**
 * Kanji that appear in Japanese place names — prefectures, the larger
 * municipalities, and the morphemes that make up the rest (山, 川, 島, 谷, 橋…).
 * Not exhaustive, and deliberately so: see the degradation note above.
 */
const PLACE_KANJI =
  "北海道青森岩手宮城秋田山形福島茨栃木群馬埼玉千葉東京神奈川新潟富石川井梨長野岐阜静岡愛知三重滋賀都大阪兵庫良和歌鳥取根広口徳香媛高知岡佐崎本分鹿児沖縄" +
  "市区町村府県郡丁目番地" +
  "中央港北南東西上下小大内外前後左右新旧本元近遠" +
  "田野原谷川山岡島崎浜津浦江沢橋橘台丘峰嶺森林松竹梅桜柳杉桑栗柿藤" +
  "水火土金木日月星空天海河池沼泉滝流洲砂石岩崖坂道路辻角通" +
  "国州府庄郷里" +
  "花草葉実根枝幹芝苗菜麦米豆茶桃梨柏栃樫椎榎槻楠柚" +
  "白黒赤青黄緑紫紺茜藍朱" +
  "一二三四五六七八九十百千万" +
  "人生子女男王主民家宅屋店寺社宮神仏堂塔門城館邸院" +
  "安平和幸福喜楽美良好吉祥栄昌隆興盛豊富貴宝寿" +
  "羽鶴亀鶯鷲鷹鴨鳩烏猿熊鹿馬牛犬猫魚鯉鮎鯛蛇竜龍虎象" +
  "駅空港線路橋川堤岸浦湾崎鼻岬礁磯洞窟穴峠谷底" +
  "早速久永遠長短高低深浅厚薄広狭多少" +
  "武文教育学校園庭公苑荘台団地区画" +
  "羅府那覇奄美壱岐対馬佐渡淡路隠岐屋久種子" +
  "梅雨春夏秋冬朝昼夕夜暁";

export const SANS_CHARS = [...new Set([...LATIN, ...KANA, ...PLACE_KANJI, ...FIXED_COPY])]
  .filter((c) => c.trim() !== "" || c === " ")
  .join("");
