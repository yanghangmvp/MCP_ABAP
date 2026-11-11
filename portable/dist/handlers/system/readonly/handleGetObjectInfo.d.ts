/**
 * GetObjectInfo — the repository object tree for a container object.
 *
 * ROUND 2 REWRITE. The previous implementation returned a success-shaped echo of
 * its own input (`{OBJECT_TYPE, OBJECT_NAME}` and nothing else) for EVERY input,
 * including its documented types, and byte-identically for a real object and for
 * a name that does not exist — so a caller had no value that meant "I could not
 * answer". Three stacked defects, all measured live on S/4HANA 2023 FPS02:
 *
 * 1. The root fetch passed `node_id='0000'`. `/repository/nodestructure` answers
 *    **HTTP 200 with an EMPTY BODY** for that node key. The proven path (the one
 *    getPackageContentsList uses) OMITS node_id on the root request. So every
 *    root call returned nothing at all, and the empty parse became an empty tree.
 *
 * 2. Even on a good response `TREE_CONTENT` is EMPTY at the root. The members
 *    are reached in TWO PHASES: the root answer carries `OBJECT_TYPES`
 *    (`SEU_ADT_OBJECT_TYPE_INFO`: OBJECT_TYPE + NODE_ID), and each of those
 *    NODE_IDs must be fetched AGAINST THE SAME PARENT to get its objects. The
 *    old code only ever read TREE_CONTENT, so the tree was unreachable by
 *    construction.
 *
 * 3. THE DANGEROUS ONE. For a NON-CONTAINER parent type the endpoint silently
 *    answers with THAT OBJECT'S PACKAGE TREE — byte-identical to the package's
 *    own response. Measured: `DTEL/DE ZMY_DATA_ELEMENT` === `DEVC/K ZMY_DDIC_PKG`
 *    (2181 bytes, same 8 type groups, same NODE_IDs), and `TABL/DS ZMY_STRUCTURE`
 *    === `DEVC/K ZMY_API_PKG`. Fixing 1 and 2 alone would therefore have made
 *    a data element report the 58 dictionary objects of its package as its own
 *    children: wrong data that looks right, which is worse than the empty echo.
 *
 * So this handler now (a) refuses a type that is not a measured container and
 * NAMES the supported list, the way GetWhereUsed does, (b) fetches both phases,
 * (c) distinguishes "does not exist" from "exists and has no members" — an empty
 * BODY means the endpoint could not resolve the object, a populated envelope
 * with zero members means genuinely empty — and (d) still cross-checks the
 * package-fallback signature at runtime, so an unmeasured type on another
 * release fails loudly instead of inventing children.
 */
import type { HandlerContext } from '../../../lib/handlers/interfaces';
export declare const TOOL_DEFINITION: {
    readonly name: "GetObjectInfo";
    readonly available_in: readonly ["onprem", "cloud"];
    readonly description: "[read-only] Object tree (members) of a CONTAINER object: package DEVC, class CLAS, interface INTF, program PROG, function group FUGR. Members carry type, description and ADT uri. Any other type is REFUSED naming the supported list. A name that cannot be resolved is an error, never an empty tree; an object that really has no members returns CHILDREN: [] with child_count 0.";
    readonly notes: "Mechanism, measured live on S/4HANA 2023 FPS02. POST /sap/bc/adt/repository/nodestructure\nis a TWO-PHASE protocol. The root request must OMIT node_id — passing node_id=0000 answers HTTP 200\nwith an EMPTY BODY, which is what made this tool return a success-shaped echo of its own input for\nevery object. The root answer carries OBJECT_TYPES/SEU_ADT_OBJECT_TYPE_INFO with one NODE_ID per\nmember type, and each NODE_ID is then fetched AGAINST THE SAME parent_type/parent_name to list that\ntype's objects. TREE_CONTENT is empty on the root request except for a package's subpackages.\n\nExistence. The endpoint answers HTTP 200 with a ZERO-LENGTH body for a name it cannot resolve, and a\npopulated envelope for one it can. That is the only signal it gives, so it is what separates \"does\nnot exist\" from \"exists and has no members\": the first is an error, the second returns CHILDREN: []\nwith child_count 0.\n\nWhy other types are refused. For a NON-CONTAINER parent the endpoint silently answers with that\nobject's PACKAGE tree. Measured: DTEL/DE ZMY_DATA_ELEMENT and DEVC/K ZMY_DDIC_PKG return byte-identical\ndocuments (same 8 type groups, same NODE_IDs), as do TABL/DS ZMY_STRUCTURE and DEVC/K ZMY_API_PKG. So\nanswering a data element would list its whole package as its members. Besides the type allow-list the\nhandler also compares a non-package result against the parent's own package tree at runtime, so a\ncontainer type not measured here fails loudly on another release instead of inventing children.\n\nFor a flat list of a package's contents prefer GetPackageContents; for one object's source outline\nprefer GetObjectStructure.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly parent_type: {
                readonly type: "string";
                readonly description: "DEVC/K, CLAS/OC, INTF/OI, PROG/P or FUGR/F.";
            };
            readonly parent_name: {
                readonly type: "string";
                readonly description: "Object name (case-insensitive).";
            };
            readonly maxDepth: {
                readonly type: "integer";
                readonly description: "Depth. 1 (default) = members; 2 also expands members that are containers.";
                readonly default: 1;
            };
            readonly enrich: {
                readonly type: "boolean";
                readonly description: "Add description/package for the ROOT node via SearchObject (default true). One extra call, not one per member.";
                readonly default: true;
            };
        };
        readonly required: readonly ["parent_type", "parent_name"];
    };
};
interface RawLeaf {
    OBJECT_TYPE?: string;
    OBJECT_NAME?: string;
    TECH_NAME?: string;
    OBJECT_URI?: string;
    DESCRIPTION?: string;
    EXPANDABLE?: string;
}
interface TypeGroup {
    objectType: string;
    label: string;
    nodeId: string;
    category: string;
}
export interface NodeDoc {
    /** True when SAP answered with a zero-length body: it could not resolve the object. */
    unresolved: boolean;
    leaves: RawLeaf[];
    groups: TypeGroup[];
}
export declare function parseNodeDoc(xmlData: string): NodeDoc;
/** The object-type NODE_ID signature of a document, used to spot a package fallback. */
export declare function groupSignature(doc: NodeDoc): string;
export declare function isContainerType(objectType: string): boolean;
export declare function handleGetObjectInfo(context: HandlerContext, args: {
    parent_type: string;
    parent_name: string;
    maxDepth?: number;
    enrich?: boolean;
}): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=handleGetObjectInfo.d.ts.map