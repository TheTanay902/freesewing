export default function (part) {
  let {
    store,
    sa,
    Point,
    points,
    Path,
    paths,
    options,
    complete,
    paperless,
    macro,
    utils,
    measurements
  } = part.shorthand()

  // Adjust neckline
  points.cbNeck = new Point(0, points.neck.y + options.backNeckCutout * measurements.neck)
  points.cbNeckCp1 = points.cbNeck.shift(0, points.neck.x / 2)
  points.neckCp2 = utils.beamIntersectsY(points.neck, points.neckCp2, points.cbNeck.y)

  // Adjust armhole
  points.shoulderCp1 = points.shoulderCp1.shiftFractionTowards(points.shoulder, 0.25)

  // Draw seamline
  paths.seam = new Path()
    .move(points.cfHem)
    .line(points.hem)
    .line(points.waist)
    .curve_(points.waistCp2, points.armhole)
    .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
    .curve(points.armholeHollowCp2, points.shoulderCp1, points.shoulder)
    .line(points.neck)
    .curve(points.neckCp2, points.cbNeckCp1, points.cbNeck)
    .line(points.cfHem)
    .close()

  // Set store values required to draft sleevecap
  store.set('sleevecapEase', 0)
  store.set(
    'backArmholeLength',
    new Path()
      .move(points.armhole)
      .curve(points.armholeCp2, points.armholeHollowCp1, points.armholeHollow)
      .curve(points.armholeHollowCp2, points.shoulderCp1, points.shoulder)
      .length()
  )

  // Complete pattern?
  if (complete) {
    macro('cutonfold', {
      from: points.cfNeck,
      to: points.cfHem,
      grainline: true
    })

    macro('title', { at: points.title, nr: 2, title: 'back' })
    points.scaleboxAnchor = points.scalebox = points.title.shift(90, 100)
    macro('scalebox', { at: points.scalebox })

    if (sa) {
    }
  }

  // Paperless?
  if (paperless) {
    //dimensions(macro, points, sa)
    //macro('vd', {
    //  from: points.cbHem,
    //  to: points.cbNeck,
    //  x: points.cbHem.x - sa - 15
    //})
  }

  return part
}
