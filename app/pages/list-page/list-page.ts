import {Component, OnInit} from '@angular/core';
import {NavController, Platform} from 'ionic-angular';
import {Photo} from '../../models/photo';
import {File, Camera} from 'ionic-native';

declare var cordova: any;
declare var plugin: any;

@Component({
  templateUrl: 'build/pages/list-page/list-page.html',
})
export class ListPage implements OnInit{

  private photos: Photo[];
  private map;
  private init: boolean;

  private locations: {place: string, latitude: number, longitude: number}[] = [
    {place: '鹿児島県鹿児島市鴨池新町５−１', latitude: 31.555588, longitude: 130.557102},
    {place: '鹿児島県鹿児島市鴨池新町１０−１', latitude: 31.560146, longitude:130.557978},
    {place: '鹿児島県鹿児島市与次郎１丁目１１−１', latitude: 31.570308, longitude:130.565299},
    {place: '鹿児島県鹿児島市中央町１−１', latitude: 31.583785, longitude:130.541245},
    {place: '鹿児島県鹿児島市本港新町３−１', latitude: 31.596112, longitude:130.5647312},
    {place: '鹿児島県鹿児島市小松原２丁目１０', latitude: 31.529364, longitude:130.527793},
    {place: '福岡県福岡市博多区博多駅中央街１−１', latitude: 33.590241, longitude:130.421221},
    {place: '東京都千代田区丸の内一丁目９', latitude: 35.681298, longitude:139.766247},
    {place: '東京都港区六本木６丁目１０', latitude: 35.660464, longitude:139.729249},
    {place: '京都府京都市東山区清水１丁目２９４', latitude: 34.994856, longitude:135.785046},
    {place: '北海道札幌市中央区北１条西２丁目', latitude: 43.062562, longitude:141.353650},
    {place: '長崎県佐世保市ハウステンボス町８', latitude: 33.086348, longitude:129.787219}
  ];

  static get parameters() {
    return [[NavController], [Platform]];
  }

  constructor(private _navController, private _platform) {
    this.photos = [];
    this.map = plugin.google.maps.Map.getMap();
    this.init = true;
  }

  ngOnInit() {

    this._platform.ready().then(() => {

      File.listDir(cordova.file.dataDirectory, '')
      .then(entrys => {

        let promises: any[] = [];
        let photo: Photo;
        for (let i = 0; i < entrys.length; i++) {
          if (entrys[i].isFile) {

            let location = this.getLocation();
            photo = new Photo();
            photo.src = entrys[i].toURL();            
            photo.place =  location.place;
            photo.longitude = location.longitude; // 経度
            photo.latitude = location.latitude;   // 緯度

            this.photos.unshift(photo);
            promises.unshift(this.getModificationTime(entrys[i]));
          }
        }
        return Promise.all(promises);
      })
      .then(modificationTimes => {
        for (let i = 0; i < this.photos.length; i++) {
          this.photos[i].date = modificationTimes[i];
        }
      })
      .catch(error => console.log(error));

    });
  }

  openCamera() {

    this._platform.ready().then(() => {

      let tempDirectory: string = cordova.file.externalApplicationStorageDirectory + 'cache/';
      let options: any = {
        quality: 50, 
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.CAMERA
      };

      if (this._platform.is('ios')) {
        options.sourceType = Camera.PictureSourceType.PHOTOLIBRARY;
        tempDirectory = cordova.file.tempDirectory;
      } 

      // カメラ起動
      Camera.getPicture(options)
      .then(imageUrl => {
        // TEMPORARYからファイルを取得
        return File.listDir(tempDirectory, '');
      })
      .then(entrys => {
        // 撮影した写真をPERSISTENTに移動
        for (let i = 0; i < entrys.length; i++) {
          if (entrys[i].isFile) {
            return File.moveFile(tempDirectory, entrys[i].name, cordova.file.dataDirectory, entrys[i].name);
          }
        }
      })
      .then(entry => {

        const location = this.getLocation();
        let photo: Photo = new Photo();
        photo.src = entry.toURL();
        photo.place =  location.place;
        photo.longitude = location.longitude; // 経度
        photo.latitude = location.latitude;  // 緯度
        this.photos.unshift(photo);

        return this.getModificationTime(entry);
      })
      .then(modificationTime => {
        this.photos[0].date = '' + modificationTime;
      })
      .catch(error => console.log(error));

    });

  }

  getLocation(): {place: string, latitude: number, longitude: number} {
    return this.locations[Math.floor(Math.random() * this.locations.length)];
  }

  getModificationTime(entry: any): any {

    var resolveFn, rejectFn;
    var promise = new Promise(function (resolve, reject) { resolveFn = resolve; rejectFn = reject; });
    entry.getMetadata(meta => {
      resolveFn(meta.modificationTime);
    }, error  => {
      rejectFn(error);
    });

    return promise;
  }

  openPicture(photo) {
    // 写真画面に移動
    // this._navController.push(Picture, {photo: photo});
  }

  openMap(photo) {
    // console.log('openMap start');
    // マップ画面に移動
    //this._navController.push(MapPage, {photo: photo});

    this._platform.ready().then(() => {

      this.map = plugin.google.maps.Map.getMap();

      this.map.addEventListener(plugin.google.maps.event.MAP_READY, () => {        

        if (this.init) {
          this.map.setCenter(new plugin.google.maps.LatLng(31.555588, 130.557102));
          this.map.setZoom(12);
        }
        this.map.setMapTypeId(plugin.google.maps.MapTypeId.ROADMAP);
        this.map.showDialog();
        this.init = false;

        let center = new plugin.google.maps.LatLng(photo.latitude, photo.longitude);
        this.map.addMarker({
          position: center,
          title: photo.place
        }, marker => {
          this.map.animateCamera({
            zoom: 12,
            target: center
          }, () => marker.showInfoWindow());
        });
      });

    });
  }
}
