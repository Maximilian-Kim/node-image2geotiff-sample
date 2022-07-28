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
  // make GeoTiff
  await makeGeoTiff("./sample/fox.jpg", "./output/fox1.tif", {
    inputFileType: "JPEG",
    EPSG: 3857,
    resolution: 1000,
    imgX: 450,
    imgY: 450,
    mapX: 0,
    mapY: 1000,
  });
  await makeGeoTiff("./sample/fox.jpg", "./output/fox2.tif", {
    inputFileType: "JPEG",
    EPSG: 3857,
    resolution: 500,
    imgX: 450,
    imgY: 450,
    mapX: 1000,
    mapY: 500,
  });

  // merge GeoTiff files
  await mergeGeoTiff("./sample/list.txt");
}

/**
 *
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
