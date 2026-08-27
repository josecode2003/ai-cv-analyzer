const multer = require('multer')
const path = require('path')
const fs = require('fs')


const uploadDirectory =
  path.join(
    __dirname,
    '../../uploads'
  )


if (!fs.existsSync(uploadDirectory)) {

  fs.mkdirSync(
    uploadDirectory,
    {
      recursive: true
    }
  )

}


const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        uploadDirectory
      )

    },


    filename: (
      req,
      file,
      cb
    ) => {

      const extension =
        path.extname(
          file.originalname
        ).toLowerCase()


      const filename =
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`


      cb(
        null,
        filename
      )

    }

  })


const fileFilter =
  (
    req,
    file,
    cb
  ) => {

    const extension =
      path.extname(
        file.originalname
      ).toLowerCase()


    const allowedMime =
      file.mimetype ===
      'application/pdf'


    const allowedExtension =
      extension === '.pdf'


    if (
      allowedMime &&
      allowedExtension
    ) {

      cb(
        null,
        true
      )

    } else {

      cb(
        new Error(
          'Solo se permiten archivos PDF'
        )
      )

    }

  }


const upload =
  multer({

    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,

      files: 1
    },

    fileFilter

  })


module.exports = upload