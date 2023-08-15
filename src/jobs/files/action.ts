import { FlatfileListener } from '@flatfile/listener'
import { handleJobReady } from '../helpers/workbookUtils'

export function initiateCreateWorkbookFromFileJob(listener: FlatfileListener) {
  listener.filter(
    { job: 'file:createWorkbookFromFile' },
    (configure: FlatfileListener) => {
      configure.on('job:ready', handleJobReady)
    }
  )
}
