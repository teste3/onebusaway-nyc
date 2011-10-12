package org.onebusaway.nyc.transit_data_manager.barcode;

import java.awt.Image;

/**
 * Interface to generate QR codes.
 * @author sclark
 *
 */
public interface QrCodeGenerator {
  
  /**
   * Set the error checking level for this generator.
   * This means allow recovery of up to x% data loss
   * L - 7%
   * M - 15%
   * Q - 25%
   * H - 30%
   * @param levelChar One of the above characters, representing an EC level.
   * @throws Exception 
   */
   void setErrorLevel(char levelChar) throws Exception;
  
  /**
   * Generate a version 2 QR code (25x25 modules) from input text. This 
   * method first checks to make sure that we don't exceed the maximum
   * length to be stored in a V2 code, which is determined by the EC level:
   * L - 77 digits, or 47 chars
   * M - 63 digits, or 38 chars
   * Q - 48 digits, or 29 chars
   * H - 34 digits, or 20 chars
   * @param width width of requested barcode image, in pixels
   * @param height height of requested barcode image, in pixels
   * @param bcText The String to be encoded in the barcode
   * @return
   * @throws Exception 
   */
  Image generateV2Code(int width, int height, String bcText) throws Exception;
  
  /**
   * Get the mimetime (as a string) of the returned qr code image.
   * @return a string, such as "image/png"
   */
  String getResultMimetype();
}