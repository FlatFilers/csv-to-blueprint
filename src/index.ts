import { FlatfileListener, FlatfileEvent } from '@flatfile/listener'
import { configureSpace } from './jobs/space/configure'
import { fileCreated } from './jobs/files/created'
import { initiateCreateWorkbookFromFileJob } from './jobs/files/action'

/**
 * This default export is used by Flatfile to register event handlers for any
 * event that occurs within the Flatfile Platform.
 *
 * @param listener
 */
export default function (listener: FlatfileListener) {
  listener.use(configureSpace)
  listener.use(fileCreated)
  listener.use(initiateCreateWorkbookFromFileJob)
}
