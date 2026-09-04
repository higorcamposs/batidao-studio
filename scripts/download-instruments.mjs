import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const output = join(process.cwd(), "public", "instruments");
const verifyOnly = process.argv.includes("--verify");
const sources = {
  vcsl: ["sgossner/VCSL", "c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e"],
  vsco: ["sgossner/VSCO-2-CE", "440300901dfe9275fd84e0b7763af1f8443ae62e"],
  guitar: [
    "sfzinstruments/karoryfer.emilyguitar",
    "b4920dc662fd9cad6dcaccdeecffdd91c8725d8c",
  ],
  sax: [
    "sfzinstruments/karoryfer.weresax",
    "a4d756b21d2a573aca0d840cce7e71ba5effd4c6",
  ],
};
const files = [
  [
    "piano/GrandPno_Main_Sus_C2_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_C2_v3_rr1.wav",
    "61344dfcf7637232cc43ef9e99a2cbafb9948772dcf529c3b2ef13a497313439",
  ],
  [
    "piano/GrandPno_Main_Sus_F2_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_F2_v3_rr1.wav",
    "003fa55611ee2514dbc9b0bed9af771c68b9c79a4b38d91fd741fd06c0c36256",
  ],
  [
    "piano/GrandPno_Main_Sus_A2_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_A2_v3_rr1.wav",
    "93912ab2114cac36f27e2684ed1097d1356b4fb4268917f8a5176d8bd8e61b88",
  ],
  [
    "piano/GrandPno_Main_Sus_C3_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_C3_v3_rr1.wav",
    "4cb2f4c181979bb3f76b454b5c26d01a7b8c91ab8703fa0b73130a4adbd74bf8",
  ],
  [
    "piano/GrandPno_Main_Sus_E3_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_E3_v3_rr1.wav",
    "5c1fab154ab17289ff02cfc5f646919f350f539ea5439fafba05bf3e50d1597e",
  ],
  [
    "piano/GrandPno_Main_Sus_G3_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_G3_v3_rr1.wav",
    "7a423a80004126bb903ddaf69e268f4f97cd1c52601e51c99cb8e71c8ab75c99",
  ],
  [
    "piano/GrandPno_Main_Sus_B3_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_B3_v3_rr1.wav",
    "936ae76cb74f40a6e2d1b85036068f589162c2129ebac78d0939ce2087c9e54d",
  ],
  [
    "piano/GrandPno_Main_Sus_D4_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_D4_v3_rr1.wav",
    "4d639f25c084c244c3a0d5591fef0f9072dfca6c136243572f968ff65ea3ac64",
  ],
  [
    "piano/GrandPno_Main_Sus_F4_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_F4_v3_rr1.wav",
    "a7535b4db455bf89a62681cb801a47e20a55c05dad94da26d432e0c61e00f1e5",
  ],
  [
    "piano/GrandPno_Main_Sus_A4_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_A4_v3_rr1.wav",
    "a145589565a2200ce6bf3c79b260f993a57cc8856fc4e1011709036440599c07",
  ],
  [
    "piano/GrandPno_Main_Sus_C5_v3_rr1.wav",
    "vcsl",
    "Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_C5_v3_rr1.wav",
    "0b97ee578f4a588aae979b51b5e03fe616c7b3a5a81436f5119ebc626b0533fa",
  ],
  ...["A3", "A4", "A5", "C3", "C4", "C5", "C6", "E3", "E4", "E5"].map(
    (note) => {
      const hashes = {
        A3: "6fc8d707afddfaaf3003551b95a83b52f514adbe488bfea1c8c5250080a07278",
        A4: "c8fd15bb561dbdac6d35ffd9c5e49413131d96f8948d5bdf03d4a03fa344c5c0",
        A5: "d35c9b6cc3fa887cb93042b901ddaa6a05c72eb9040bd125d82a0940366f9022",
        C3: "4f221909317e257e4d0bc49f10479643c80cb213a0486455c1bdc1d6ed13a450",
        C4: "105a6dbced98de7ae04a317bdd3ba1a5c6b90dc94034439b68cce6635e2781df",
        C5: "46a335b804c9b2f081efa8e6c695f155d05b3700c69bf73950cc9cb40ed53d41",
        C6: "0d1c902873564fac780ded78ce54788745bc81b0b3113b311169cfee9fdf9357",
        E3: "87c667c2af888ed86dff87f2452248de3e3d958fc93848a4426b7c16f85f09da",
        E4: "b609d37fb577e2a0f64f20800fba4bed067151375349bf713c0d4e803f862580",
        E5: "660df172b551dfd7859dade283cb1e8dd6eac8095ccaabb5b19416caaacdef87",
      };
      const name = `LDFlute_susNV_${note}_v1_1.wav`;
      return [
        `flute/${name}`,
        "vsco",
        `Woodwinds/Flute/susNV/${name}`,
        hashes[note],
      ];
    },
  ),
  ...[
    "a2",
    "a3",
    "a4",
    "c3",
    "c4",
    "c5",
    "db2",
    "e2",
    "eb3",
    "eb4",
    "gb2",
    "gb3",
    "gb4",
  ].map((note) => {
    const hashes = {
      a2: "b0031818b989d576cdc189154c90162e1b545b7ee9c56a6640ce0e7e658079c4",
      a3: "97da917363eef473435df5e215cedf18579fdef7d7cb0f677f9a50f085930c13",
      a4: "4df039e1d517e727149ba4ef8e1616ead6761ab485fa541f522611a9388471b8",
      c3: "255adb40062435e8774a8d02f26b98f7741f3496b362eb265ca3453f5e4ad55d",
      c4: "67643ecb0b523745ff80127396a5c8c6e871115102020c34ab84cce3140aab70",
      c5: "5e2f79f8b12e1cde3fdaa62e7c441907fd39eb3a222c3d240ae227a241a9f5ee",
      db2: "7056fe063dddb9c5b3d288d9800171a44111772fc0b999498b4b0867d4b67fe6",
      e2: "e1a2c4443e754a40afed733430ef52fa35490e110f2bacee429ccffd61e9d201",
      eb3: "12978712adecefb7643c2f0e2632e87f684c26654073ce425e708c70e642c5b5",
      eb4: "bffb64bc23b38596507e0b62abe5d7df7e70364a0564ca71bdbed27b9b91b8d2",
      gb2: "aab2c703be7803f4f9f2ca0783700132a7a653aab9ee23b51095423d8a63dfc2",
      gb3: "0cd292ead34dc8ff7c4e4daf4638d73f3a81b95a50f531c626cf0e737babe785",
      gb4: "cfcffc387151aaec0e29f23d28004404ab964d0fd1cd819303a5f7e4711d1e87",
    };
    const name = `${note}_mf_rr1.wav`;
    return [`guitar/${name}`, "guitar", `notes/${name}`, hashes[note]];
  }),
  ...["a3", "ab4", "c3", "c4", "eb3", "eb4", "gb3", "gb4"].map((note) => {
    const hashes = {
      a3: "acf50ea6ee806da0e58fe3c4c715d1dbf63467f7e48e1268ee8cff94bcf7949d",
      ab4: "f124db253df1239a5d02816e9dcd3f07e75592bc0399d4e8b7d662528a0b9d86",
      c3: "03a948c74660d1725917245a39f202c71ee67facc345ffdfcacdc6dfbab3a733",
      c4: "cfde9898fb96c29307a1f317b05d8bea00fabab3f4f4a223bd1054f53e8862cf",
      eb3: "9806cf3e354e5b1f2f044cb2fb435d2e34e5ba0ffd52471e170aacb3b873c1ae",
      eb4: "068e6a40339548961d565e398c0fb33f818025e34c86eb4f33b099b2ace4259b",
      gb3: "8220f0ce76c129e05723146167348d387e62e4a6c5a16c1f885d6a3e0076a670",
      gb4: "ff7ce7a8f14147d9c48cb7970ea6bc61c2043c945d05a9d84bca483077778b43",
    };
    const name = `${note}_p_rr1_cnd.wav`;
    return [`sax/${name}`, "sax", `Samples/alto/${name}`, hashes[note]];
  }),
];

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
for (const [relative, sourceId, sourcePath, expected] of files) {
  const target = join(output, relative);
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target) && !verifyOnly) {
    const [repository, commit] = sources[sourceId];
    const response = await fetch(
      `https://raw.githubusercontent.com/${repository}/${commit}/${encodePath(sourcePath)}`,
    );
    if (!response.ok)
      throw new Error(`Download falhou (${response.status}): ${relative}`);
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  }
  if (!existsSync(target)) throw new Error(`Arquivo ausente: ${relative}`);
  const actual = createHash("sha256")
    .update(readFileSync(target))
    .digest("hex");
  if (actual !== expected) throw new Error(`Hash inválido: ${relative}`);
}
console.log(`${files.length} samples de instrumentos verificados.`);
