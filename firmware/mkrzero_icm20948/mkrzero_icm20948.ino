// arduino mkr zero, single icm 20948 9dof imu over i2c
// streams ax,ay,az,gx,gy,gz,mx,my,mz over usb serial at 115200
// accel in g, gyro in deg/s, mag in uT, no gps on this board so
// only 9 values are sent, the display app accepts 9 or 11 value lines
//
// library: sparkfun 9dof imu breakout - icm 20948 (arduino library
// manager, search "SparkFun ICM-20948")
// wiring: icm20948 sda -> mkr zero sda, scl -> mkr zero scl, 3.3v, gnd
// set AD0_VAL to 0 if the breakout's ad0 pin is tied low instead of high

#include "ICM_20948.h"

#define WIRE_PORT Wire
#define AD0_VAL 1

ICM_20948_I2C imu;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    // waits for the host app to open the port, fine for a booth demo
    // where the ground station is always the one powering this up
  }

  WIRE_PORT.begin();
  WIRE_PORT.setClock(400000);

  bool ready = false;
  while (!ready) {
    imu.begin(WIRE_PORT, AD0_VAL);
    if (imu.status != ICM_20948_Stat_Ok) {
      Serial.println("icm20948 not responding, retrying");
      delay(500);
    } else {
      ready = true;
    }
  }

  if (imu.startupMagnetometer() != ICM_20948_Stat_Ok) {
    Serial.println("magnetometer init failed, mag readings may be zero");
  }
}

void loop() {
  if (imu.dataReady()) {
    imu.getAGMT();

    float ax = imu.accX() / 1000.0;
    float ay = imu.accY() / 1000.0;
    float az = imu.accZ() / 1000.0;
    float gx = imu.gyrX();
    float gy = imu.gyrY();
    float gz = imu.gyrZ();
    float mx = imu.magX();
    float my = imu.magY();
    float mz = imu.magZ();

    Serial.print(ax, 3); Serial.print(",");
    Serial.print(ay, 3); Serial.print(",");
    Serial.print(az, 3); Serial.print(",");
    Serial.print(gx, 2); Serial.print(",");
    Serial.print(gy, 2); Serial.print(",");
    Serial.print(gz, 2); Serial.print(",");
    Serial.print(mx, 2); Serial.print(",");
    Serial.print(my, 2); Serial.print(",");
    Serial.println(mz, 2);
  }

  delay(20); // roughly 50hz
}
