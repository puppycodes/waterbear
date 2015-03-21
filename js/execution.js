/**
 * Abstracts the execution state. That is, all the stuff required for running
 * blocks. It goes in here!
 *
 * The exported class `Process` is kind of similar to a Unix process in that
 * there is one shared memory, but it contains a bunch of "strands" (kind of
 * like threads) that may run concurrently.
 *
 * @author Eddie Antonio Santos @eddieantonio
 * Date:   March 2015
 */
window.WaterbearProcess = (function () {
    'use strict';

    var assert = console.assert.bind(console);

    /* TODO: When the strand is terminated... now what? There are no more
     * instructions! */

    /**
     * A single execution strand! Think of it as a thread: it keeps track of the
     * current scope (thus, "the stack"), and thus, has a bunch of nested
     * "frames.
     */
    function Strand(instruction, scope) {
        this.currentInstruction = instruction;
        this.scope = scope;
    }

    /**
     * Runes the next instruction, updating the instruction pointer and scope
     * as appropriate.
     *
     * Returns: true if this strand has more instructions to execute.
     */
    Strand.prototype.doNext = function next() {
        assert(this.currentInstruction !== null, 'current instruction undefined.');

        /* The scope is mutable so... it gets mutated. */
        this.currentInstruction.run(this.scope);
        this.currentInstruction = this.next();

        return this.currentInstruction !== null;
    };

    /**
     * Get the next instruction in this strand.
     */
    Strand.prototype.next = function next() {
        var nextInstruction;

        /* FIXME: TERRIBLE SEPARATION OF CONCERNS AND ALSO WRONG. */
        /* TODO: This is the responsibility of the next() callbacks. */
        nextInstruction = this.currentInstruction.nextElementSibling;

        assert(nextInstruction === null || typeof nextInstruction.run === 'function',
               'Block does not have a callable property `run`');

        return nextInstruction;
    };

    /**
     * Creates the root strand -- that is, the strand from which all other
     * strands originate from.
     */
    Strand.createRootStrand = function createRootStrand() {
        var globalScope = {},
            /* FIXME: THIS DOM STUFF DOES NOT BELONG HERE! */
            firstInstruction = dom.find('wb-workspace > wb-contains > *');

        return new Strand(firstInstruction, globalScope);
    };


    /**
     * Encapsulates the execution of a Waterbear program. There may be several
     * "threads", so this encompasses all of them. ALL OF THEM.
     *
     * This is a "one-time use" object! This means that once `start` is
     * called, it cannot be started all over again. Similarly, once
     * `terminate` is called, you can consider this object useless.
     */
    function Process() {
        var started = false;

        /* Set some essential state. */
        this.strands = [];
        this.currentStrand = null;
        this.paused = false;

        /* Disable breakpoints. */
        this.shouldBreak = false;
        /* Run as quickly as possible. */
        this.delay = 0;
        this.nextTimeout = null;

        this.doNextStep = this.nextStep.bind(this);

        /*
         * This `started` tomfoolery ensures that the Process object is a
         * "one-time use" object.  Once it's started, it can't be started
         * again; and once it's terminated, it's gone for good. Want to start
         * again? Instantiate a brand new Process()!
         */
        Object.defineProperties(this, {
            /* `started` is trapped in this closure, thus it can only be
             * changed in this constructor, or any function defined within this
             * constructor. */
            started: {
                get: function () { return started; },
                enumerable: true
            },
            /* Once this is called, started can never be `false`. */
            setStarted: {
                value: function () { started = true; },
                enumerable: false
            }
        });
    }

    /**
     * Starts (asynchronous!) execution from scratch. Can only be called once.
     */
    Process.prototype.start = function start(firstInstruction) {
        assert(!this.started, 'Waterbear already started!');
        this.setStarted();

        if (firstInstruction === undefined) {
            this.currentStrand = Strand.createRootStrand();
        } else {
            /* TODO: Create a brand new strand. */
            assert(false, 'Not implemented: Start on specific instruction.');
        }

        this.strands.push(this.currentStrand);

        /* This starts asynchronous execution. */
        this.resumeAsync();

        return this;
    };

    /**
     * Resume executing immediately. Execution is as fast as the rate given to
     * `setRate` (default: unlimited).
     */
    Process.prototype.resumeAsync = function resumeAsync() {
        assert(this.started);

        this.paused = false;
        this.nextTimeout = enqueue(this.doNextStep);
        return this;
    };

    /**
     * Requests execution to pause before the next instruction.
     */
    Process.prototype.pause = function pause() {
        assert(this.started);
        this.paused = true;
        this.cancelNextTimeout();
        return this;
    };

    /**
     * Sets rate of execution in milliseconds / instruction.
     * If rate is not provided or undefined, the rate is unlimited.
     */
    Process.prototype.setRate = function setRate(rate) {
        if (rate === undefined) {
            this.rate = 0;
        } else {
            assert((+rate) > 0, 'Must provide positive number for rate.');
            this.rate = +rate;
        }
        return this;
    };

    /**
     * Requests to cleanly terminates the current process.
     * Once this has happened, this process should no longer be used.
     * `cb` is called once the process has cleanly terminated.
     */
    Process.prototype.terminate = function terminate(cb) {
        assert(this.started);
        this.pause();
        /* TODO: I dunno what else should be cleaned. */
        return this;
    };


    /**
     * Enables all breakpoints. Execution will pause on all breakpoints.
     */
    Process.prototype.enableBreakpoints = function enableBreakpoints() {
        this.shouldBreak = true;
        return this;
    };

    /**
     * Disables all breakpoints. Execution will continue regardless if there
     * is any breakpoint set on an instruction.
     */
    Process.prototype.disableBreakpoints = function disableBreakpoints() {
        this.shouldBreak = false;
        return this;
    };

    /** Internal methods **/

    /**
     * Note: the constructor should bind an alias to this method called
     * `doNextStep` which simply calls this but BINDS `this` TO THE METHOD
     * CALL (which is the only way anything will ever work :/).
     */
    Process.prototype.nextStep = function nextStep() {
        var hasNext;
        if (this.paused) {
            return;
        }

        /* TODO: Decide if we should break. */
        /* TODO: Decide if we should switch to a different strand. */

        hasNext = this.currentStrand.doNext();

        if (hasNext) {
            /* Setup the next step to run after delay. */
            this.nextTimeout = setTimeout(this.doNextStep, this.delay);
        } else {
            /* TODO: this strand is now terminated... */
            /* Remove it from the list and... :/ */
            /* FIXME: Remove this console.log. */
            console.log('Strand execution halted...');
        }
    };

    /**
     * Prevents the next callback from running.
     */
    Process.prototype.cancelNextTimeout = function cancelNextTimeout() {
        if (this.nextTimeout !== null) {
            clearTimeout(this.nextTimeout);
            this.nextTimeout = null;
        }
        return this;
    };


    /**
     * Execute `fn` asynchronously. Its execution will happen as soon as
     * possible, but note that it may yield to several other "threads".
     */
    function enqueue(fn) {
        /* FIXME: Use setImmediate or equivalent. */
        return setTimeout(fn, 0);
    }


    /* This is the export of the module. */
    return Process;
}());
