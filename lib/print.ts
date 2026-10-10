import type {ConferenceData} from './domain';
/** Spare copies per resolution for the Chairs and the Approval Panel. */
export const PRINT_SPARES=3;
/** Copies to print: one per delegate in the committee plus spares. Set when a resolution is approved;
 *  the server does the same in private.print_copies (Admins cannot read delegates). */
export function printCopies(d:Pick<ConferenceData,'delegates'>,committeeId:string){
 return Math.min(10000,d.delegates.filter(x=>x.committeeId===committeeId).length+PRINT_SPARES);
}
