export type RoomId = 'modern' | 'nature' | 'design';
export type Item = 'mirror' | 'vanity' | 'toilet' | 'shower' | 'tub' | 'radiator';
export type CameraView = 'overview' | 'top' | 'entrance' | 'vanity' | 'shower';
export type Selection = Record<Item, number>;
export interface Room {id:RoomId;name:string;subtitle:string;description:string;size:[number,number];wall:string;floor:string;wood:string;metal:string;swatches:string[];materials:string[];tub:boolean;}
export const rooms:Room[]=[
 {id:'modern',name:'Klassisch – Modern',subtitle:'Klare Linien. Zeitlose Ruhe.',description:'Helle Keramik, klare Formen und dezente Chromdetails. Ein Bad, das jeden Tag leicht macht.',size:[3.6,3.2],wall:'#d7ddd7',floor:'#bdbbb2',wood:'#9daaa1',metal:'#adb8bc',swatches:['#dddcd4','#9daaa1','#afb9bd'],materials:['Feinsteinzeug','Salbeigrün','Chrom'],tub:false},
 {id:'nature',name:'Natur Pur',subtitle:'Natürlich ankommen.',description:'Warme Eiche trifft auf sanften Sandstein. Natürliche Materialien für Ihren persönlichen Rückzugsort.',size:[4,3.6],wall:'#d8cfbb',floor:'#bdac8e',wood:'#aa7950',metal:'#a89b80',swatches:['#d8ccb2','#aa7950','#6e7a5a'],materials:['Sandstein','Eiche natur','Gebürstetes Metall'],tub:true},
 {id:'design',name:'Extravagantes Design',subtitle:'Ein Statement für die Sinne.',description:'Dunkler Stein, ausdrucksstarke Formen und warme Messingakzente. Ein Bad mit eigenem Charakter.',size:[4.6,3.8],wall:'#494c4b',floor:'#646664',wood:'#393a37',metal:'#b3975e',swatches:['#4e5351','#393a37','#b3975e'],materials:['Dunkler Stein','Graphit','Messing'],tub:true}
];
export const labels:Record<Item,string>={mirror:'Spiegel',vanity:'Waschtisch',toilet:'WC',shower:'Dusche',tub:'Badewanne',radiator:'Heizung'};
export interface Product {name:string;material:string;dimensions:string;color:string;description:string;}
export const products:Record<Item,Product[]>={
 mirror:[{name:'Spiegel Rund LED',material:'Glas / Aluminium',dimensions:'Ø 80 cm',color:'Warmweiß, 3.000 K',description:'Runder Lichtspiegel mit sanfter, umlaufender LED-Beleuchtung.'},{name:'Spiegel Pure',material:'Spiegelglas',dimensions:'100 × 70 cm',color:'Rahmenlos',description:'Eine klare, großzügige Spiegelfläche mit dezent geschliffenen Kanten.'},{name:'Spiegelschrank Trio',material:'Glas / Aluminium',dimensions:'100 × 70 × 16 cm',color:'Aluminium',description:'Drei Spiegeltüren verbinden Stauraum mit einer ruhigen Optik.'}],
 vanity:[{name:'Waschtisch Soft',material:'Keramik / lackiertes Holz',dimensions:'100 × 50 × 55 cm',color:'Passend zur Badwelt',description:'Schwebender Waschtisch mit Aufsatzbecken und zwei breiten Auszügen.'},{name:'Waschtisch Eiche',material:'Keramik / Eichenfurnier',dimensions:'120 × 50 × 55 cm',color:'Eiche natur',description:'Mehr Ablagefläche und warme Holzfronten mit feiner Maserung.'},{name:'Waschtisch Graphit',material:'Mineralguss / lackiertes Holz',dimensions:'90 × 50 × 55 cm',color:'Graphit matt',description:'Kompakte Form mit dunkler Front und einem runden Aufsatzbecken.'}],
 toilet:[{name:'Wand-WC Soft',material:'Sanitärkeramik',dimensions:'36 × 54 × 38 cm',color:'Weiß glänzend',description:'Wandhängendes WC mit weichen Konturen und geschlossenem Deckel.'},{name:'Wand-WC Cube',material:'Sanitärkeramik',dimensions:'37 × 54 × 38 cm',color:'Weiß matt',description:'Geradlinige Form für ein architektonisch klares Gesamtbild.'},{name:'Wand-WC Noir',material:'Sanitärkeramik',dimensions:'36 × 54 × 38 cm',color:'Schwarz matt',description:'Ein dunkler Akzent mit sanft gerundetem Sitz.'}],
 shower:[{name:'Walk-in Pure',material:'Sicherheitsglas / Edelstahl',dimensions:'120 × 120 cm',color:'Klarglas / Chrom',description:'Offene Dusche mit transparenter Glaswand und Regendusche.'},{name:'Walk-in Black',material:'Sicherheitsglas / Aluminium',dimensions:'120 × 120 cm',color:'Klarglas / Schwarz',description:'Schwarze Profile setzen einen markanten Rahmen.'},{name:'Walk-in Bronze',material:'Sicherheitsglas / Metall',dimensions:'120 × 120 cm',color:'Bronzeglas / Messing',description:'Warm getöntes Glas und goldene Armaturen für eine besondere Atmosphäre.'}],
 tub:[{name:'Badewanne Oval',material:'Mineralguss',dimensions:'170 × 80 cm',color:'Weiß matt',description:'Freistehende Wanne mit sanften Rundungen und tiefem Innenraum.'},{name:'Badewanne Linear',material:'Sanitäracryl',dimensions:'170 × 80 cm',color:'Weiß glänzend',description:'Geradlinige Außenkontur mit breitem, komfortablem Rand.'},{name:'Badewanne Stone',material:'Mineralguss',dimensions:'170 × 80 cm',color:'Graphit / Weiß',description:'Skulpturale Wanne mit dunkler Außenseite und heller Innenfläche.'}],
 radiator:[{name:'Heizkörper Classic',material:'Stahl',dimensions:'50 × 120 cm',color:'Weiß',description:'Schlanker Handtuchheizkörper mit gleichmäßigen Querstreben.'},{name:'Heizkörper Graphit',material:'Stahl',dimensions:'50 × 120 cm',color:'Graphit matt',description:'Dunkle Oberfläche mit Platz für warme Handtücher.'},{name:'Heizkörper Messing',material:'Stahl, beschichtet',dimensions:'50 × 120 cm',color:'Messing gebürstet',description:'Ein warmer Metallton als funktionaler Blickfang.'}]
};
export function positionFor(room:Room,item:Item):[number,number,number] {
 const [w,d]=room.size;
 const positions:Record<Item,[number,number,number]>={
 vanity:[-w/2+.85,0,-d/2+.35],mirror:[-w/2+.85,0,-d/2+.08],
 toilet:[room.id==='design'?.45:.8,0,-d/2+.35],shower:[-w/2+.65,0,d/2-.65],
 radiator:[-w/2+.08,0,0],tub:[w/2-.58,0,room.id==='nature'?.45:.25]};
 return positions[item];
}
export const roomItems=(room:Room):Item[]=>['mirror','vanity','toilet','shower',...(room.tub?['tub' as Item]:[]),'radiator'] as Item[];
export const cameras:{id:CameraView;label:string}[]=[{id:'overview',label:'Raumübersicht'},{id:'top',label:'Draufsicht'},{id:'entrance',label:'Eingang'},{id:'vanity',label:'Waschtisch'},{id:'shower',label:'Dusche'}];
