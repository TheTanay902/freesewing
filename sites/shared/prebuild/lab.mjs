import fs_ from 'fs'
import path from 'path'
import axios from 'axios'
import { designsByType } from '../../../config/software/index.mjs'

const fs = fs_.promises

const header = `/*
 *
 * This page was auto-generated by the prebuild script
 * Any changes you make to it will be lost on the next (pre)build.
 *
 * If you want to make changes, update the pageTemplate in:
 *
 *   sites/shared/prebuild/lab.mjs
 *
 */
`
const loadFromUnpkg = (design, version) => {
  const start = Date.now()
  return axios
  .get(`https://unpkg.com/@freesewing/${design}@${version}/dist/index.mjs`)
  .then(res => {
    if (res.data) {
      console.log(`Downloaded @freesewing/${design}@${version} in ${Date.now() - start}ms`)
      return res.data
    }
    return false
  })
  .catch(err => false)
}

const pageTemplate = design => `${header}
import design from 'designs/${design}/src/index.js'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import PageTemplate from 'site/page-templates/workbench'

const Page = (props) => <PageTemplate {...props} design={design} version="next"/>
export default Page

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    }
  }
}
`

const versionedPageTemplate = (design, version) => `${header}
import design from 'lib/${version}/${design}.mjs'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import PageTemplate from 'site/page-templates/workbench.js'

const Page = (props) => <PageTemplate {...props} design={design} version="${version}"/>
export default Page

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    }
  }
}
`

const versionOverviewPage = (version) => `${header}
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Template from 'site/page-templates/design-list.js'

const Page = props => <Template {...props} version="${version}" />

export default Page

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale)),
    }
  }
}
`



/*
 * Main method that does what needs doing
 */

export const prebuildLab = async (site) => {
  const promises = []
  const availableVersions = {}
  // Load config
  const versions = JSON.parse(await fs.readFile(
    path.resolve('..', 'lab', 'versions.json'),
    'utf-8'
  ))
  for (const section in designsByType) {
    // Iterate over sections
    console.log(`Generating pages for ${section} designs`)
    for (const design in designsByType[section]) {

      // Generate pattern pages for next
      console.log(`  - ${design}`)
      const page = pageTemplate(design)
      const pages = ['..', 'lab', 'pages']
      await fs.mkdir(path.resolve(...pages, 'v', 'next'), { recursive: true })
      promises.push(
        fs.writeFile(
          path.resolve(...pages, `${design}.mjs`),
          page
        ),
        fs.writeFile(
          path.resolve(...pages, section, `${design}.mjs`),
          page
        ),
        fs.writeFile(
          path.resolve(...pages, 'v', 'next', `${design}.mjs`),
          page
        )
      )

      if (process.env.BUILD_ALL_VERSIONS) {
        // Download published versions from unpkg
        for (const version of versions) {
          if (typeof availableVersions[version] === 'undefined') availableVersions[version] = new Set()
          // Assume that if the file is on disk, it's good to go (caching)
          const file = path.resolve('..', 'lab', 'lib', version, `${design}.mjs`)
          let cached
          try {
            await fs.access(file)
            cached = true
          }
          catch(err) {
            cached = false
          }
          if (!cached) {
            await fs.mkdir(path.resolve('..', 'lab', 'lib', version), { recursive: true })
            await fs.mkdir(path.resolve('..', 'lab', 'pages', 'v', version), { recursive: true })
            const code = (await loadFromUnpkg(design, version))
            if (code) {
              availableVersions[version].add(design)
              promises.push(
                fs.writeFile(
                  path.resolve('..', 'lab', 'lib', version, `${design}.mjs`),
                  code
                ),
                fs.writeFile(
                  path.resolve('..', 'lab', 'pages', 'v', version, `${design}.mjs`),
                  versionedPageTemplate(design, version)
                ),
              )
            } else console.log(`No ${version} for ${design}`)
          } else {
            availableVersions[version].add(design)
          }
        }
      }
    }
  }

  if (process.env.BUILD_ALL_VERSIONS) {
    // Write available versions file
    const av = {}
    for (const [v, set] of Object.entries(availableVersions)) av[v] = [...set].sort()
    promises.push(
      fs.writeFile(
        path.resolve('..', 'lab', 'available-versions.json'),
        JSON.stringify(av, null, 2)
      )
    )
    // Also add version overview pages
    for (const version of versions) {
      // Assume that if the file is on disk, it's good to go (caching)
      const page = path.resolve('..', 'lab', 'pages', 'v', version, 'index.js')
      let cached
      try {
        await fs.access(page)
        cached = true
      }
      catch(err) {
        cached = false
      }
      // Create page if it's not there already
      if (!cached) promises.push(fs.writeFile(page, versionOverviewPage(version)))
    }
  }

  await Promise.all(promises)
}


