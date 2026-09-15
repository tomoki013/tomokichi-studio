export type RegionDirectoryItem = {
  ja?: string;
  en: string;
  metaJa?: string;
  metaEn?: string;
};

const parse = (
  raw: string,
  defaultMetaJa?: string,
  defaultMetaEn?: string,
): RegionDirectoryItem[] =>
  raw
    .trim()
    .split("\n")
    .map((line) => {
      const [ja, en, metaJa, metaEn] = line.split("|");
      return {
        ja: ja || undefined,
        en,
        metaJa: metaJa || defaultMetaJa,
        metaEn: metaEn || defaultMetaEn,
      };
    });

export const regionDirectories: Record<string, RegionDirectoryItem[]> = {
  JP: parse(
    `北海道|Hokkaido
青森県|Aomori
岩手県|Iwate
宮城県|Miyagi
秋田県|Akita
山形県|Yamagata
福島県|Fukushima
茨城県|Ibaraki
栃木県|Tochigi
群馬県|Gunma
埼玉県|Saitama
千葉県|Chiba
東京都|Tokyo
神奈川県|Kanagawa
新潟県|Niigata
富山県|Toyama
石川県|Ishikawa
福井県|Fukui
山梨県|Yamanashi
長野県|Nagano
岐阜県|Gifu
静岡県|Shizuoka
愛知県|Aichi
三重県|Mie
滋賀県|Shiga
京都府|Kyoto
大阪府|Osaka
兵庫県|Hyogo
奈良県|Nara
和歌山県|Wakayama
鳥取県|Tottori
島根県|Shimane
岡山県|Okayama
広島県|Hiroshima
山口県|Yamaguchi
徳島県|Tokushima
香川県|Kagawa
愛媛県|Ehime
高知県|Kochi
福岡県|Fukuoka
佐賀県|Saga
長崎県|Nagasaki
熊本県|Kumamoto
大分県|Oita
宮崎県|Miyazaki
鹿児島県|Kagoshima
沖縄県|Okinawa`,
    "都道府県",
    "Prefecture",
  ),

  FR: parse(
    `|Ain|01|Department 01
|Aisne|02|Department 02
|Allier|03|Department 03
|Alpes-de-Haute-Provence|04|Department 04
|Hautes-Alpes|05|Department 05
|Alpes-Maritimes|06|Department 06
|Ardèche|07|Department 07
|Ardennes|08|Department 08
|Ariège|09|Department 09
|Aube|10|Department 10
|Aude|11|Department 11
|Aveyron|12|Department 12
|Bouches-du-Rhône|13|Department 13
|Calvados|14|Department 14
|Cantal|15|Department 15
|Charente|16|Department 16
|Charente-Maritime|17|Department 17
|Cher|18|Department 18
|Corrèze|19|Department 19
|Corse-du-Sud|2A|Department 2A
|Haute-Corse|2B|Department 2B
|Côte-d'Or|21|Department 21
|Côtes-d'Armor|22|Department 22
|Creuse|23|Department 23
|Dordogne|24|Department 24
|Doubs|25|Department 25
|Drôme|26|Department 26
|Eure|27|Department 27
|Eure-et-Loir|28|Department 28
|Finistère|29|Department 29
|Gard|30|Department 30
|Haute-Garonne|31|Department 31
|Gers|32|Department 32
|Gironde|33|Department 33
|Hérault|34|Department 34
|Ille-et-Vilaine|35|Department 35
|Indre|36|Department 36
|Indre-et-Loire|37|Department 37
|Isère|38|Department 38
|Jura|39|Department 39
|Landes|40|Department 40
|Loir-et-Cher|41|Department 41
|Loire|42|Department 42
|Haute-Loire|43|Department 43
|Loire-Atlantique|44|Department 44
|Loiret|45|Department 45
|Lot|46|Department 46
|Lot-et-Garonne|47|Department 47
|Lozère|48|Department 48
|Maine-et-Loire|49|Department 49
|Manche|50|Department 50
|Marne|51|Department 51
|Haute-Marne|52|Department 52
|Mayenne|53|Department 53
|Meurthe-et-Moselle|54|Department 54
|Meuse|55|Department 55
|Morbihan|56|Department 56
|Moselle|57|Department 57
|Nièvre|58|Department 58
|Nord|59|Department 59
|Oise|60|Department 60
|Orne|61|Department 61
|Pas-de-Calais|62|Department 62
|Puy-de-Dôme|63|Department 63
|Pyrénées-Atlantiques|64|Department 64
|Hautes-Pyrénées|65|Department 65
|Pyrénées-Orientales|66|Department 66
|Bas-Rhin|67|Department 67
|Haut-Rhin|68|Department 68
|Rhône|69|Department 69
|Haute-Saône|70|Department 70
|Saône-et-Loire|71|Department 71
|Sarthe|72|Department 72
|Savoie|73|Department 73
|Haute-Savoie|74|Department 74
パリ|Paris|75|Department 75
|Seine-Maritime|76|Department 76
|Seine-et-Marne|77|Department 77
|Yvelines|78|Department 78
|Deux-Sèvres|79|Department 79
|Somme|80|Department 80
|Tarn|81|Department 81
|Tarn-et-Garonne|82|Department 82
|Var|83|Department 83
|Vaucluse|84|Department 84
|Vendée|85|Department 85
|Vienne|86|Department 86
|Haute-Vienne|87|Department 87
|Vosges|88|Department 88
|Yonne|89|Department 89
|Territoire de Belfort|90|Department 90
|Essonne|91|Department 91
|Hauts-de-Seine|92|Department 92
|Seine-Saint-Denis|93|Department 93
|Val-de-Marne|94|Department 94
|Val-d'Oise|95|Department 95
グアドループ|Guadeloupe|971・海外県|Department 971 · overseas
マルティニーク|Martinique|972・海外県|Department 972 · overseas
フランス領ギアナ|Guyane|973・海外県|Department 973 · overseas
レユニオン|La Réunion|974・海外県|Department 974 · overseas
マヨット|Mayotte|976・海外県|Department 976 · overseas`,
    "県",
    "Department",
  ),

  ES: parse(
    `ア・コルーニャ|A Coruña
アラバ|Álava/Araba
アルバセテ|Albacete
アリカンテ|Alicante/Alacant
アルメリア|Almería
アストゥリアス|Asturias
アビラ|Ávila
バダホス|Badajoz
バルセロナ|Barcelona
ビスカヤ|Bizkaia
ブルゴス|Burgos
カセレス|Cáceres
カディス|Cádiz
カンタブリア|Cantabria
カステリョン|Castellón/Castelló
シウダー・レアル|Ciudad Real
コルドバ|Córdoba
クエンカ|Cuenca
ギプスコア|Gipuzkoa
ジローナ|Girona
グラナダ|Granada
グアダラハラ|Guadalajara
ウエルバ|Huelva
ウエスカ|Huesca
バレアレス諸島|Illes Balears
ハエン|Jaén
ラ・リオハ|La Rioja
ラス・パルマス|Las Palmas
レオン|León
リェイダ|Lleida
ルーゴ|Lugo
マドリード|Madrid
マラガ|Málaga
ムルシア|Murcia
ナバラ|Navarra
オウレンセ|Ourense
パレンシア|Palencia
ポンテベドラ|Pontevedra
サラマンカ|Salamanca
サンタ・クルス・デ・テネリフェ|Santa Cruz de Tenerife
セゴビア|Segovia
セビリア|Sevilla
ソリア|Soria
タラゴナ|Tarragona
テルエル|Teruel
トレド|Toledo
バレンシア|Valencia/València
バリャドリード|Valladolid
サモラ|Zamora
サラゴサ|Zaragoza
セウタ|Ceuta|自治市|Autonomous city
メリリャ|Melilla|自治市|Autonomous city`,
    "県",
    "Province",
  ),

  KR: parse(
    `ソウル特別市|Seoul Special City|特別市|Special city
釜山広域市|Busan Metropolitan City|広域市|Metropolitan city
大邱広域市|Daegu Metropolitan City|広域市|Metropolitan city
仁川広域市|Incheon Metropolitan City|広域市|Metropolitan city
光州広域市|Gwangju Metropolitan City|広域市|Metropolitan city
大田広域市|Daejeon Metropolitan City|広域市|Metropolitan city
蔚山広域市|Ulsan Metropolitan City|広域市|Metropolitan city
世宗特別自治市|Sejong Special Self-Governing City|特別自治市|Special self-governing city
京畿道|Gyeonggi Province|道|Province
忠清北道|North Chungcheong Province|道|Province
忠清南道|South Chungcheong Province|道|Province
全羅南道|South Jeolla Province|道|Province
慶尚北道|North Gyeongsang Province|道|Province
慶尚南道|South Gyeongsang Province|道|Province
江原特別自治道|Gangwon Special Self-Governing Province|特別自治道|Special self-governing province
全北特別自治道|Jeonbuk Special Self-Governing Province|特別自治道|Special self-governing province
済州特別自治道|Jeju Special Self-Governing Province|特別自治道|Special self-governing province`,
  ),

  EG: parse(
    `アレクサンドリア|Alexandria
アスワン|Aswan
アシュート|Asyut
ブハイラ|Beheira
ベニ・スエフ|Beni Suef
カイロ|Cairo
ダカリーヤ|Dakahlia
ダミエッタ|Damietta
ファイユーム|Faiyum
ガルビーヤ|Gharbia
ギザ|Giza
イスマイリア|Ismailia
カフル・アッシャイフ|Kafr El Sheikh
ルクソール|Luxor
マトルーフ|Matrouh
ミニヤ|Minya
モヌーフィーヤ|Monufia
ニューバレー|New Valley
北シナイ|North Sinai
ポートサイド|Port Said
カリュービーヤ|Qalyubia
ケナ|Qena
紅海|Red Sea
シャルキーヤ|Sharqia
ソハーグ|Sohag
南シナイ|South Sinai
スエズ|Suez`,
    "県（governorate）",
    "Governorate",
  ),

  TH: parse(
    `バンコク|Bangkok|特別行政区域|Special local administration
|Amnat Charoen
|Ang Thong
|Bueng Kan
|Buri Ram
|Chachoengsao
|Chai Nat
|Chaiyaphum
|Chanthaburi
チェンマイ|Chiang Mai
チェンライ|Chiang Rai
チョンブリー|Chon Buri
|Chumphon
|Kalasin
|Kamphaeng Phet
|Kanchanaburi
|Khon Kaen
クラビ|Krabi
|Lampang
|Lamphun
|Loei
|Lop Buri
|Mae Hong Son
|Maha Sarakham
|Mukdahan
|Nakhon Nayok
|Nakhon Pathom
|Nakhon Phanom
|Nakhon Ratchasima
|Nakhon Sawan
|Nakhon Si Thammarat
|Nan
|Narathiwat
|Nong Bua Lam Phu
|Nong Khai
|Nonthaburi
|Pathum Thani
|Pattani
|Phang Nga
|Phatthalung
|Phayao
|Phetchabun
|Phetchaburi
|Phichit
|Phitsanulok
アユタヤ|Phra Nakhon Si Ayutthaya
|Phrae
プーケット|Phuket
|Prachin Buri
|Prachuap Khiri Khan
|Ranong
|Ratchaburi
|Rayong
|Roi Et
|Sa Kaeo
|Sakon Nakhon
|Samut Prakan
|Samut Sakhon
|Samut Songkhram
|Saraburi
|Satun
|Sing Buri
|Si Sa Ket
|Songkhla
|Sukhothai
|Suphan Buri
スラートターニー|Surat Thani
|Surin
|Tak
|Trang
|Trat
|Ubon Ratchathani
|Udon Thani
|Uthai Thani
|Uttaradit
|Yala
|Yasothon`,
    "県",
    "Province",
  ),

  TR: parse(
    `|Adana
|Adıyaman
|Afyonkarahisar
|Ağrı
|Aksaray
|Amasya
アンカラ|Ankara
アンタルヤ|Antalya
|Ardahan
|Artvin
|Aydın
|Balıkesir
|Bartın
|Batman
|Bayburt
|Bilecik
|Bingöl
|Bitlis
|Bolu
|Burdur
ブルサ|Bursa
|Çanakkale
|Çankırı
|Çorum
|Denizli
|Diyarbakır
|Düzce
|Edirne
|Elazığ
|Erzincan
|Erzurum
|Eskişehir
ガズィアンテプ|Gaziantep
|Giresun
|Gümüşhane
|Hakkâri
|Hatay
|Iğdır
|Isparta
イスタンブール|Istanbul
イズミル|İzmir
|Kahramanmaraş
|Karabük
|Karaman
|Kars
|Kastamonu
|Kayseri
|Kırıkkale
|Kırklareli
|Kırşehir
|Kilis
|Kocaeli
コンヤ|Konya
|Kütahya
|Malatya
|Manisa
|Mardin
|Mersin
|Muğla
|Muş
ネヴシェヒル|Nevşehir
|Niğde
|Ordu
|Osmaniye
|Rize
|Sakarya
|Samsun
|Şanlıurfa
|Siirt
|Sinop
|Şırnak
|Sivas
|Tekirdağ
|Tokat
|Trabzon
|Tunceli
|Uşak
|Van
|Yalova
|Yozgat
|Zonguldak`,
    "県（il）",
    "Province (il)",
  ),

  US: parse(
    `アラバマ州|Alabama
アラスカ州|Alaska
アリゾナ州|Arizona
アーカンソー州|Arkansas
カリフォルニア州|California
コロラド州|Colorado
コネチカット州|Connecticut
デラウェア州|Delaware
フロリダ州|Florida
ジョージア州|Georgia
ハワイ州|Hawaii
アイダホ州|Idaho
イリノイ州|Illinois
インディアナ州|Indiana
アイオワ州|Iowa
カンザス州|Kansas
ケンタッキー州|Kentucky
ルイジアナ州|Louisiana
メイン州|Maine
メリーランド州|Maryland
マサチューセッツ州|Massachusetts
ミシガン州|Michigan
ミネソタ州|Minnesota
ミシシッピ州|Mississippi
ミズーリ州|Missouri
モンタナ州|Montana
ネブラスカ州|Nebraska
ネバダ州|Nevada
ニューハンプシャー州|New Hampshire
ニュージャージー州|New Jersey
ニューメキシコ州|New Mexico
ニューヨーク州|New York
ノースカロライナ州|North Carolina
ノースダコタ州|North Dakota
オハイオ州|Ohio
オクラホマ州|Oklahoma
オレゴン州|Oregon
ペンシルベニア州|Pennsylvania
ロードアイランド州|Rhode Island
サウスカロライナ州|South Carolina
サウスダコタ州|South Dakota
テネシー州|Tennessee
テキサス州|Texas
ユタ州|Utah
バーモント州|Vermont
バージニア州|Virginia
ワシントン州|Washington
ウェストバージニア州|West Virginia
ウィスコンシン州|Wisconsin
ワイオミング州|Wyoming
ワシントンD.C.|Washington, D.C.|連邦地区|Federal district
プエルトリコ|Puerto Rico|州ではない地域|U.S. territory / area
グアム|Guam|州ではない地域|U.S. territory / area
米領ヴァージン諸島|U.S. Virgin Islands|州ではない地域|U.S. territory / area
北マリアナ諸島|Northern Mariana Islands|州ではない地域|U.S. territory / area
米領サモア|American Samoa|州ではない地域|U.S. territory / area`,
    "州",
    "State",
  ),

  MY: parse(
    `ジョホール|Johor|州|State
ケダ|Kedah|州|State
クランタン|Kelantan|州|State
マラッカ（ムラカ）|Melaka|州|State
ヌグリ・スンビラン|Negeri Sembilan|州|State
パハン|Pahang|州|State
ペラ|Perak|州|State
プルリス|Perlis|州|State
ペナン|Pulau Pinang|州|State
サバ|Sabah|州|State
サラワク|Sarawak|州|State
セランゴール|Selangor|州|State
トレンガヌ|Terengganu|州|State
クアラルンプール|Kuala Lumpur|連邦直轄領|Federal territory
ラブアン|Labuan|連邦直轄領|Federal territory
プトラジャヤ|Putrajaya|連邦直轄領|Federal territory`,
  ),

  BE: parse(
    `アントウェルペン州|Antwerp|州（フランデレン）|Province · Flemish Region
東フランデレン州|East Flanders|州（フランデレン）|Province · Flemish Region
フラームス＝ブラバント州|Flemish Brabant|州（フランデレン）|Province · Flemish Region
リンブルフ州|Limburg|州（フランデレン）|Province · Flemish Region
西フランデレン州|West Flanders|州（フランデレン）|Province · Flemish Region
エノー州|Hainaut|州（ワロン）|Province · Walloon Region
リエージュ州|Liège|州（ワロン）|Province · Walloon Region
リュクサンブール州|Luxembourg|州（ワロン）|Province · Walloon Region
ナミュール州|Namur|州（ワロン）|Province · Walloon Region
ブラバン・ワロン州|Walloon Brabant|州（ワロン）|Province · Walloon Region
ブリュッセル首都圏地域|Brussels-Capital Region|州に属さない地域|Region · not a province`,
  ),

  SG: parse(
    `中央エリア|Central|Colorvia旅行エリア|Colorvia travel area
チャンギ|Changi|Colorvia旅行エリア|Colorvia travel area
ダウンタウン|Downtown|Colorvia旅行エリア|Colorvia travel area
東部|East|Colorvia旅行エリア|Colorvia travel area
北部|North|Colorvia旅行エリア|Colorvia travel area
北東部|North-East|Colorvia旅行エリア|Colorvia travel area
南部|South|Colorvia旅行エリア|Colorvia travel area
西部|West|Colorvia旅行エリア|Colorvia travel area`,
  ),
};
