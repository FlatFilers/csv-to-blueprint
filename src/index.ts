import { FlatfileListener, FlatfileEvent } from '@flatfile/listener'
import { configureSpace } from './jobs/space/configure'
import { fileCreated } from './jobs/files/created'

/**
 * This default export is used by Flatfile to register event handlers for any
 * event that occurs within the Flatfile Platform.
 *
 * @param listener
 */
export default function (listener: FlatfileListener) {
  listener.use(configureSpace)
  listener.use(fileCreated)
}
