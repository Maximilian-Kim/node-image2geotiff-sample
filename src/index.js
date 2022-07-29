const GDAL = require("gdal-async");
const { spawn } = require("child_process");

/**
 * @typedef MakeGeoTiffParams
 * @property {string} inputFileType // https://gdal.org/drivers/raster/gpkg.html#raster-gpkg
 * @property {number} EPSG
 * @property {number} resolution // meter per pixel 좌표계|픽셀 비율 - 이미지가 좌표계상에서 표현될 범위를 계산하기위해 필요
 * @property {number} imgX // image width
 * @property {number} imgY // image height
 * @property {number} mapX // 좌표계상 위치시킬 좌상단 x 좌표
 * @property {number} mapY // 좌표계상 위치시킬 좌상단 y 좌표
 */

async function sample() {

  const scale = 1000 // 1000 meter
  const img = "./sample/fox.jpg"

  // make GeoTiff
  await Promise.all([
    makeGeoTiff(img, "./output/fox1.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 1 * scale, imgX: 450, imgY: 450, mapX: 0, mapY: 1 * scale }),
    makeGeoTiff(img, "./output/fox2.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 2 * scale, imgX: 450, imgY: 450, mapX: 1 * scale, mapY: 2 * scale }),
    makeGeoTiff(img, "./output/fox3.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 3 * scale, imgX: 450, imgY: 450, mapX: 3 * scale, mapY: 3 * scale }),
    makeGeoTiff(img, "./output/fox4.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 4 * scale, imgX: 450, imgY: 450, mapX: 6 * scale, mapY: 4 * scale }),
    makeGeoTiff(img, "./output/fox5.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 5 * scale, imgX: 450, imgY: 450, mapX: 10 * scale, mapY: 5 * scale }),
    makeGeoTiff(img, "./output/fox6.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 6 * scale, imgX: 450, imgY: 450, mapX: 15 * scale, mapY: 6 * scale }),
    makeGeoTiff(img, "./output/fox7.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 7 * scale, imgX: 450, imgY: 450, mapX: 21 * scale, mapY: 7 * scale }),
    makeGeoTiff(img, "./output/fox8.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 8 * scale, imgX: 450, imgY: 450, mapX: 28 * scale, mapY: 8 * scale }),
    makeGeoTiff(img, "./output/fox9.tif", { inputFileType: "JPEG", EPSG: 3857, resolution: 9 * scale, imgX: 450, imgY: 450, mapX: 36 * scale, mapY: 9 * scale }),

  ])

  // merge GeoTiff files
  await mergeGeoTiff("./sample/list.txt");
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {MakeGeoTiffParams} params
 */
async function makeGeoTiff(inputPath, outputPath, params) {
  const tiffDrive = GDAL.drivers.get("GTiff");
  const jpegDrive = GDAL.drivers.get(params.inputFileType);

  // 원본 불러오기
  const inputFile = await jpegDrive.openAsync(inputPath);

  // tiff 변환 파일 생성
  // options check here : https://gdal.org/drivers/raster/gtiff.html#creation-options
  const tmp_file = await tiffDrive.createCopyAsync(outputPath, inputFile, {
    COMPRESS: "JPEG",
    JPEG_QUALITY: 100,
  });

  // 좌표계 설정
  const sr = GDAL.SpatialReference.fromEPSG(params.EPSG);
  tmp_file.srs = sr;

  // 위치 설정
  const pixelX = params.resolution / params.imgX;
  const pixelY = params.resolution / params.imgY;
  const coordX = params.mapX;
  const coordY = params.mapY;
  tmp_file.geoTransform = [coordX, pixelX, 0, coordY, 0, -pixelY];

  // 저장
  await tmp_file.flushAsync();
  tmp_file.close();
}

async function mergeGeoTiff(listFilePath) {
  // make vrt - https://gdal.org/programs/gdalbuildvrt.html
  await new Promise((ok, no) => {
    const cmd = spawn("gdalbuildvrt", [
      "-addalpha",
      "-input_file_list",
      listFilePath,
      "./output/output.vrt",
    ]);

    cmd.addListener("close", () => {
      ok();
    });

    cmd.addListener("error", (err) => {
      console.log(err);
      no();
    });
  });

  // export vrt to tiff - https://gdal.org/programs/gdal_translate.html
  await new Promise((ok, no) => {
    const cmd = spawn("gdal_translate", [
      "./output/output.vrt",
      "./output/output.tif",
    ]);

    cmd.addListener("close", () => {
      ok();
    });

    cmd.addListener("error", (err) => {
      console.log(err);
      no();
    });
  });
}

sample();
